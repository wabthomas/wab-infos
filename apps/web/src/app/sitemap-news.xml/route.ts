import { NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';
import { getRecentArticlesForNewsSitemap } from '@/lib/strapi';

export async function GET() {
  let articles: Awaited<ReturnType<typeof getRecentArticlesForNewsSitemap>> = [];

  try {
    articles = await getRecentArticlesForNewsSitemap(48);
  } catch {
    // Fallback empty sitemap
  }

  const urls = articles
    .map((article) => {
      const loc = `${siteConfig.url}/${article.category?.slug ?? 'actualites'}/${article.slug}`;
      return `  <url>
    <loc>${loc}</loc>
    <news:news>
      <news:publication>
        <news:name>${siteConfig.name}</news:name>
        <news:language>fr</news:language>
      </news:publication>
      <news:publication_date>${article.publishedAt}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
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
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
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
