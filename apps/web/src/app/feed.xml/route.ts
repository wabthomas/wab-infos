import { NextResponse } from 'next/server';
import { editorialConfig, getArticlePath, siteConfig } from '@/config/site';
import { getArticles } from '@/lib/strapi';
import { getMockArticlesIfEnabled } from '@/lib/mock-data';
import { getArticleDisplayDate, getStrapiMediaAbsoluteUrl } from '@/lib/utils';

/** Logo canal RSS : 144×110 (plafond RSS 2.0 : 144×400). public/rss-image.png */
const RSS_IMAGE = { path: '/rss-image.png', width: 144, height: 110 } as const;

export async function GET() {
  let articles;
  try {
    const result = await getArticles({ pageSize: 50, full: true });
    articles = result.articles;
  } catch {
    articles = getMockArticlesIfEnabled({ pageSize: 50 });
  }

  const items = articles
    .map((article) => {
      const url = `${siteConfig.url}${getArticlePath(article)}`;
      const imageUrl =
        getStrapiMediaAbsoluteUrl(article.featuredImage?.url) ??
        getStrapiMediaAbsoluteUrl(article.featuredImage?.formats?.medium?.url) ??
        siteConfig.ogImage;
      const imageAlt = article.featuredImage?.alternativeText || article.title;
      const category = article.category?.name;
      const encodedContent = article.content || `<p>${article.excerpt}</p>`;

      const displayDate = getArticleDisplayDate(article);

      return `    <item>
      <title>${escapeXml(article.seoTitle || article.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(article.seoDescription || article.excerpt)}</description>
      <pubDate>${new Date(displayDate).toUTCString()}</pubDate>
      ${article.author ? `<author>${escapeXml(article.author.email ?? article.author.name)}</author>` : ''}
      ${category ? `<category>${escapeXml(category)}</category>` : ''}
      <media:content url="${escapeXml(imageUrl)}" medium="image" type="image/jpeg">
        <media:title>${escapeXml(imageAlt)}</media:title>
      </media:content>
      <media:thumbnail url="${escapeXml(imageUrl)}" />
      <content:encoded><![CDATA[${encodedContent}]]></content:encoded>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${siteConfig.url}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>fr</language>
    <managingEditor>${escapeXml(editorialConfig.contactEmail)} (${escapeXml(siteConfig.name)})</managingEditor>
    <webMaster>${escapeXml(editorialConfig.contactEmail)} (${escapeXml(siteConfig.name)})</webMaster>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <image>
      <url>${siteConfig.url}${RSS_IMAGE.path}</url>
      <title>${escapeXml(siteConfig.name)}</title>
      <link>${siteConfig.url}</link>
      <width>${RSS_IMAGE.width}</width>
      <height>${RSS_IMAGE.height}</height>
    </image>
    <atom:link href="${siteConfig.url}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
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
