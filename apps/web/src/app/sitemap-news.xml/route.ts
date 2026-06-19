import { NextResponse } from 'next/server';
import { getArticlePath, siteConfig } from '@/config/site';
import { getRecentArticlesForNewsSitemap } from '@/lib/strapi';

export async function GET() {
  let articles: Awaited<ReturnType<typeof getRecentArticlesForNewsSitemap>> = [];

  try {
    articles = await getRecentArticlesForNewsSitemap(48);
  } catch {
    // Fallback empty sitemap
  }

  const publicationName = siteConfig.googleNewsPublication || siteConfig.name;

  const urls = articles
    .map((article) => {
      const loc = `${siteConfig.url}${getArticlePath(article)}`;
      const keywords = article.tags?.map((tag) => tag.name).join(', ');
      const keywordsXml = keywords
        ? `\n      <news:keywords>${escapeXml(keywords)}</news:keywords>`
        : '';

      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(publicationName)}</news:name>
        <news:language>fr</news:language>
      </news:publication>
      <news:publication_date>${article.publishedAt}</news:publication_date>
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
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
    },
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
