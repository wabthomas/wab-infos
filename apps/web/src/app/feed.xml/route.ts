import { NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';
import { getArticles } from '@/lib/strapi';
import { getMockArticles } from '@/lib/mock-data';

export async function GET() {
  let articles;
  try {
    const result = await getArticles({ pageSize: 50 });
    articles = result.articles;
  } catch {
    articles = getMockArticles({ pageSize: 50 });
  }

  const items = articles
    .map((article) => {
      const url = `${siteConfig.url}/${article.category?.slug ?? 'actualites'}/${article.slug}`;
      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(article.excerpt)}</description>
      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
      ${article.author ? `<author>${escapeXml(article.author.email ?? article.author.name)}</author>` : ''}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${siteConfig.url}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>fr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteConfig.url}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
