import { NextResponse } from 'next/server';
import qs from 'qs';
import { getStrapiUrl } from '@/lib/redaction/config';
import { notifyEditorsByEmail } from '@/lib/redaction/web-push';

const MILESTONES = [100, 500, 1000, 10000] as const;

const COPY: Record<(typeof MILESTONES)[number], { title: string; body: string }> = {
  100: {
    title: 'Bravo — 100 lectures !',
    body: 'Votre article vient de dépasser 100 vues. Continuez, le public est là.',
  },
  500: {
    title: '500 vues — ça cartonne',
    body: 'Déjà 500 lecteurs sur votre article. Un bel élan : gardez ce rythme.',
  },
  1000: {
    title: '1 000 vues — cap franchi',
    body: 'Votre article a atteint 1 000 lectures. Félicitations, c’est un vrai succès.',
  },
  10000: {
    title: '10 000 vues — exceptionnel',
    body: 'Dix mille lectures ! Merci pour ce travail. Le public Wab-infos est conquis.',
  },
};

function nearestMilestone(viewCount: number): (typeof MILESTONES)[number] | null {
  if (MILESTONES.includes(viewCount as (typeof MILESTONES)[number])) {
    return viewCount as (typeof MILESTONES)[number];
  }
  return null;
}

export async function POST(request: Request) {
  const secret = request.headers.get('x-revalidation-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      documentId?: string;
      viewCount?: number;
      slug?: string;
      category?: string;
    };
    const documentId = body.documentId?.trim();
    const viewCount = Number(body.viewCount);
    if (!documentId || !Number.isFinite(viewCount)) {
      return NextResponse.json({ error: 'documentId et viewCount requis' }, { status: 400 });
    }

    const milestone = nearestMilestone(viewCount);
    if (!milestone) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const token = process.env.STRAPI_API_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'STRAPI_API_TOKEN manquant' }, { status: 500 });
    }

    const query = qs.stringify(
      {
        filters: { documentId: { $eq: documentId } },
        populate: { author: { fields: ['email', 'name'] }, category: { fields: ['slug'] } },
        fields: ['title', 'slug'],
        pagination: { pageSize: 1 },
        status: 'published',
      },
      { encodeValuesOnly: true }
    );

    const res = await fetch(`${getStrapiUrl()}/api/articles?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Article introuvable' }, { status: 502 });
    }
    const json = (await res.json()) as {
      data?: Array<{
        title?: string;
        slug?: string;
        author?: { email?: string; name?: string } | Array<{ email?: string; name?: string }>;
        category?: { slug?: string };
      }>;
    };
    const article = json.data?.[0];
    const author = Array.isArray(article?.author) ? article.author[0] : article?.author;
    const email = author?.email?.trim();
    if (!article || !email) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'no-author-email' });
    }

    const copy = COPY[milestone];
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wab-infos.com').replace(/\/$/, '');
    const categorySlug = article.category?.slug || body.category;
    const slug = article.slug || body.slug;
    const url =
      categorySlug && slug ? `${siteUrl}/${categorySlug}/${slug}` : '/stats';

    const result = await notifyEditorsByEmail([email], {
      title: copy.title,
      body: `${copy.body}${article.title ? ` « ${article.title} »` : ''}`,
      url,
    });

    return NextResponse.json({ ok: true, milestone, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Notification impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
