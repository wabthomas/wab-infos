import { NextRequest, NextResponse } from 'next/server';
import { getArticleBySlug } from '@/lib/strapi';
import {
  buildArticleNewsletterSubject,
  renderArticleNewsletterHtml,
} from '@/lib/newsletter/article-template';
import { mapArticleToNewsletterPreview } from '@/lib/newsletter/send-article';
import { newsletterConfig } from '@/lib/newsletter/config';

/** Aperçu HTML du template newsletter (protégé par secret). */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (!secret || secret !== newsletterConfig.secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'Paramètre slug requis.' }, { status: 400 });
  }

  try {
    const article = await getArticleBySlug(slug);
    if (!article) {
      return NextResponse.json({ error: 'Article introuvable.' }, { status: 404 });
    }

    const previewUrl = `${newsletterConfig.siteUrl}/newsletter/desinscription?token=preview`;
    const payload = mapArticleToNewsletterPreview(article, previewUrl);
    const html = renderArticleNewsletterHtml(payload);
    const subject = buildArticleNewsletterSubject(payload);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Newsletter-Subject': subject,
      },
    });
  } catch (error) {
    console.error('[newsletter/preview]', error);
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 });
  }
}
