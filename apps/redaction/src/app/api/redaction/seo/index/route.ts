import { NextResponse } from 'next/server';
import {
  listEditorArticles,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';
import { triggerSiteArticleRevalidation } from '@/lib/redaction/trigger-site-revalidation';

interface NotifyResult {
  ok: boolean;
  submitted: number;
  indexNow?: { ok?: boolean; submitted?: number };
  google?: {
    ok?: boolean;
    configured?: boolean;
    submitted?: number;
    succeeded?: number;
    failed?: number;
    errors?: string[];
  };
  error?: string;
}

function formatNotifyMessage(result: NotifyResult, articleCount?: number): string {
  if (result.error) return result.error;

  const parts: string[] = [];
  if (articleCount != null) {
    parts.push(`${articleCount} article${articleCount > 1 ? 's' : ''}`);
  }

  const indexOk = Boolean(result.indexNow?.ok);
  const googleConfigured = Boolean(result.google?.configured);
  const googleOk = Boolean(result.google?.ok);
  const googleSucceeded = result.google?.succeeded ?? 0;

  if (indexOk) {
    parts.push(`IndexNow OK (${result.indexNow?.submitted ?? result.submitted} URL)`);
  } else {
    parts.push('IndexNow non confirmé');
  }

  if (!googleConfigured) {
    parts.push('Google non configuré (service account)');
  } else if (googleOk) {
    parts.push(`Google Indexing OK (${googleSucceeded} URL)`);
  } else {
    const detail = result.google?.errors?.[0];
    parts.push(detail ? `Google échoué (${detail})` : 'Google Indexing échoué');
  }

  parts.push('Cache site rafraîchi');
  return parts.join(' · ');
}

async function submitSeoNotify(payload: {
  urls?: string[];
  articles?: { category: string; slug: string }[];
}): Promise<NotifyResult> {
  const secret = process.env.REVALIDATION_SECRET?.trim();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wab-infos.com').replace(/\/$/, '');
  if (!secret) {
    return { ok: false, submitted: 0, error: 'REVALIDATION_SECRET manquant' };
  }

  try {
    const res = await fetch(`${siteUrl}/api/seo/indexnow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidation-secret': secret,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as NotifyResult & { error?: string };
    if (!res.ok) {
      return {
        ok: false,
        submitted: 0,
        error: data.error || `HTTP ${res.status}`,
      };
    }
    return {
      ok: Boolean(data.ok),
      submitted: data.submitted ?? 0,
      indexNow: data.indexNow,
      google: data.google,
    };
  } catch (err) {
    return {
      ok: false,
      submitted: 0,
      error: err instanceof Error ? err.message : 'Erreur réseau',
    };
  }
}

/**
 * Indexation 1 clic depuis la rédaction (IndexNow + Google Indexing).
 * Body: { mode: 'article' | 'recent', category?: string, slug?: string, limit?: number }
 */
export async function POST(request: Request) {
  try {
    const user = await requireRedactionUser();
    const body = (await request.json()) as {
      mode?: 'article' | 'recent';
      category?: string;
      slug?: string;
      limit?: number;
    };

    const mode = body.mode === 'recent' ? 'recent' : 'article';

    if (mode === 'article') {
      const category = body.category?.trim();
      const slug = body.slug?.trim();
      if (!category || !slug) {
        return NextResponse.json(
          { error: 'category et slug requis pour indexer un article' },
          { status: 400 }
        );
      }

      await triggerSiteArticleRevalidation({ slug, categorySlug: category });
      const result = await submitSeoNotify({ articles: [{ category, slug }] });

      return NextResponse.json({
        ok: result.ok,
        submitted: result.submitted,
        indexNow: result.indexNow,
        google: result.google,
        message: formatNotifyMessage(result),
      });
    }

    if (user.role === 'author') {
      return NextResponse.json(
        { error: 'Indexation groupée réservée aux éditeurs' },
        { status: 403 }
      );
    }

    const limit = Math.min(40, Math.max(1, body.limit ?? 20));
    const { articles } = await listEditorArticles(user, 'published', {
      page: 1,
      pageSize: limit,
      omitContent: true,
    });

    const targets = articles
      .filter((a) => a.slug && a.category?.slug)
      .map((a) => ({ category: a.category!.slug, slug: a.slug }));

    if (targets.length === 0) {
      return NextResponse.json({
        ok: false,
        submitted: 0,
        message: 'Aucun article publié à indexer.',
      });
    }

    for (const item of targets.slice(0, 5)) {
      await triggerSiteArticleRevalidation({
        slug: item.slug,
        categorySlug: item.category,
      });
    }

    const result = await submitSeoNotify({ articles: targets });
    return NextResponse.json({
      ok: result.ok,
      submitted: result.submitted,
      articles: targets.length,
      indexNow: result.indexNow,
      google: result.google,
      message: formatNotifyMessage(result, targets.length),
    });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Indexation impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
