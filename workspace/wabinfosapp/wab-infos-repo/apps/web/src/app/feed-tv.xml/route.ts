import { NextResponse } from 'next/server';
import { getVideoPagePath, siteConfig } from '@/config/site';
import { getAllVideosForSitemap } from '@/lib/strapi';
import { getChannelRecentVideos } from '@/lib/youtube-channel';
import { getYoutubeThumbnailUrl } from '@/lib/seo';

export async function GET() {
  const entries: {
    youtubeId: string;
    title: string;
    description: string;
    publishedAt: string;
  }[] = [];
  const seen = new Set<string>();

  const add = (entry: (typeof entries)[number]) => {
    if (seen.has(entry.youtubeId)) return;
    seen.add(entry.youtubeId);
    entries.push(entry);
  };

  try {
    const strapiVideos = await getAllVideosForSitemap();
    for (const video of strapiVideos) {
      if (!video.youtubeId) continue;
      add({
        youtubeId: video.youtubeId,
        title: video.title,
        description: video.description || `${video.title} — Wab-infos TV`,
        publishedAt: video.publishedAt,
      });
    }
  } catch {
    // Strapi unavailable
  }

  try {
    const channelId = siteConfig.youtubeChannelId;
    if (channelId) {
      const recent = await getChannelRecentVideos(channelId, 30);
      for (const video of recent) {
        add({
          youtubeId: video.videoId,
          title: video.title,
          description: video.description || `${video.title} — Wab-infos TV`,
          publishedAt: video.publishedAt,
        });
      }
    }
  } catch {
    // YouTube feed unavailable
  }

  const items = entries
    .map((video) => {
      const pageUrl = `${siteConfig.url}${getVideoPagePath(video.youtubeId)}`;
      const thumb = getYoutubeThumbnailUrl(video.youtubeId);
      return `    <item>
      <title>${escapeXml(video.title)}</title>
      <link>${escapeXml(pageUrl)}</link>
      <guid isPermaLink="true">${escapeXml(pageUrl)}</guid>
      <description>${escapeXml(video.description)}</description>
      <pubDate>${new Date(video.publishedAt).toUTCString()}</pubDate>
      <category>Wab-infos TV</category>
      <media:thumbnail url="${escapeXml(thumb)}" />
      <media:content url="${escapeXml(thumb)}" medium="image" type="image/jpeg" />
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(siteConfig.name)} — Wab-infos TV</title>
    <link>${siteConfig.url}/tv</link>
    <description>Vidéos, replays et émissions de la chaîne Wab-infos TV</description>
    <language>fr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteConfig.url}/feed-tv.xml" rel="self" type="application/rss+xml"/>
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
