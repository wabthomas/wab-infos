import { NextResponse } from 'next/server';
import { normalizeSiteSeoSettings } from '@wab-infos/shared';
import { getArticleDisplayDate } from '@/lib/utils';
import { getArticlePath, siteConfig } from '@/config/site';
import { getSiteSettings } from '@/lib/site-settings.server';
import { getRecentArticlesForNewsSitemap } from '@/lib/strapi';

/**
 * Sitemap Google News — uniquement les articles des 48 dernières heures.
 *
 * Cache très court : c’est le fichier que Google News vient lire pour publier
 * une info. 30 min de cache = 30 min de retard de découverte.
 */
export async function GET() {
  let articles: Awaited<ReturnType<typeof getRecentArticlesForNewsSitemap>> = [];

  try {
    articles = await getRecentArticlesForNewsSitemap(48);
  } catch {
    return new NextResponse('News sitemap temporarily unavailable', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'Retry-After': '300',
      },
    });
  }

  // Google News exige le nom EXACT de Publisher Center (« Wab-infos »).
  // Le réglage éditable (Strapi) prime sur la variable d’environnement, souvent
  // saisie en minuscules et figée dans le build car préfixée NEXT_PUBLIC_.
  let publicationName = siteConfig.googleNewsPublication || siteConfig.publisher;
  try {
    const seo = normalizeSiteSeoSettings((await getSiteSettings()).chrome.seo);
    const configured = seo.googleNewsPublication.trim();
    if (configured) publicationName = configured;
  } catch {
    // Strapi indisponible : on garde la valeur d’environnement.
  }
  const now = Date.now();

  const urls = articles
    .filter((article) => {
      // Sécurité : ne jamais publier une URL noindex dans le sitemap News.
      if (article.seoMeta && article.seoMeta.robotsIndex === false) return false;
      const time = new Date(getArticleDisplayDate(article)).getTime();
      return Number.isFinite(time) && now - time <= 48 * 60 * 60 * 1000;
    })
    .map((article) => {
      const loc = `${siteConfig.url}${getArticlePath(article)}`;
      const keywords = article.tags?.map((tag) => tag.name).join(', ');
      const keywordsXml = keywords
        ? `\n      <news:keywords>${escapeXml(keywords)}</news:keywords>`
        : '';
      const lastmod = safeIsoDate(article.updatedAt || getArticleDisplayDate(article));

      return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <news:news>
      <news:publication>
        <news:name>${escapeXml(publicationName)}</news:name>
        <news:language>fr</news:language>
      </news:publication>
      <news:publication_date>${getArticleDisplayDate(article)}</news:publication_date>
      <news:title>${escapeXml(article.seoTitle || article.title)}</news:title>${keywordsXml}
    </news:news>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
    },
  });
}

function safeIsoDate(value?: string | Date): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
