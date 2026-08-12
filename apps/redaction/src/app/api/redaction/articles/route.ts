import { NextResponse } from 'next/server';
import {
  applyDraftSaveHeader,
  createEditorArticle,
  isExplicitEditorPublish,
  isLiveRedactionArticle,
  listEditorArticles,
  normalizeEditorSavePayload,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';
import { triggerReaderPushOnPublish } from '@/lib/redaction/trigger-reader-push';
import type { ArticleEditorPayload } from '@/lib/redaction/types';
import { getEditorSiteSettings } from '@/lib/redaction/site-settings';
import { defaultArticleEmptyContent } from '@wab-infos/shared';
import { excerptFromContent } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const user = await requireRedactionUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'draft' | 'published' | 'scheduled' | 'all' | null;
    const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
    const pageSize = Math.min(50, Math.max(6, Number(searchParams.get('pageSize') ?? '6') || 6));
    const authorDocumentId = searchParams.get('author')?.trim() || undefined;
    const categoryDocumentId = searchParams.get('category')?.trim() || undefined;
    const importedOnly = searchParams.get('imported') === '1';
    const search = searchParams.get('q')?.trim() || undefined;
    const sortRaw = searchParams.get('sort')?.trim() || 'updatedAt:desc';
    const allowedSorts = new Set([
      'updatedAt:desc',
      'updatedAt:asc',
      'publishedAt:desc',
      'views:desc',
      'views:asc',
      'seo:desc',
      'seo:asc',
      'title:asc',
      'category:asc',
      'author:asc',
    ]);
    const sort = (allowedSorts.has(sortRaw) ? sortRaw : 'updatedAt:desc') as
      | 'updatedAt:desc'
      | 'updatedAt:asc'
      | 'publishedAt:desc'
      | 'views:desc'
      | 'views:asc'
      | 'seo:desc'
      | 'seo:asc'
      | 'title:asc'
      | 'category:asc'
      | 'author:asc';

    const result = await listEditorArticles(user, status ?? 'all', {
      page,
      pageSize,
      authorDocumentId,
      categoryDocumentId,
      importedOnly,
      search,
      sort,
      omitContent: true,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Impossible de charger les articles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRedactionUser();
    const raw = applyDraftSaveHeader(
      (await request.json()) as ArticleEditorPayload,
      request
    );
    const siteSettings = await getEditorSiteSettings();
    const emptyContent = defaultArticleEmptyContent(siteSettings.chrome.articleUi);
    const content = raw.content?.trim() || emptyContent;
    const excerpt =
      raw.excerpt?.trim() || excerptFromContent(content, 170) || raw.title?.trim().slice(0, 170);

    const body = normalizeEditorSavePayload(
      {
        ...raw,
        content,
        excerpt: excerpt || 'Brouillon',
      },
      { defaultToDraft: true }
    );

    if (body.draftOnly) {
      if (!body.title?.trim() && !body.content?.trim()) {
        return NextResponse.json({ error: 'Titre ou contenu requis pour le brouillon' }, { status: 400 });
      }
      if (!body.categoryDocumentIds?.length) {
        return NextResponse.json({ error: 'Au moins une rubrique est requise' }, { status: 400 });
      }
    } else {
      if (!body.title?.trim() || !excerpt || !content.replace(/<[^>]+>/g, '').trim()) {
        return NextResponse.json({ error: 'Titre, chapô et contenu requis' }, { status: 400 });
      }
      if (!body.categoryDocumentIds?.length) {
        return NextResponse.json({ error: 'Au moins une rubrique est requise' }, { status: 400 });
      }
    }

    const article = await createEditorArticle(user, body as ArticleEditorPayload);
    if (isExplicitEditorPublish(body) && isLiveRedactionArticle(article)) {
      void triggerReaderPushOnPublish(article.slug);
    }
    return NextResponse.json({ article }, { status: 201 });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Création impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
