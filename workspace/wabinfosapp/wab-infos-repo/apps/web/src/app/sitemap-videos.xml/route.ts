import { NextResponse } from 'next/server';
import { getVideoPagePath, siteConfig } from '@/config/site';
import { getAllVideosForSitemap } from '@/lib/strapi';
import { getChannelRecentVideos } from '@/lib/youtube-channel';
import { getStrapiMediaUrl } from '@/lib/utils';
import { getYoutubeThumbnailUrl } from '@/lib/seo';

export async function GET() {
  const entries: {
    youtubeId: string;
    title: string;
    description: string;
    publishedAt: string;
    thumbnail: string;
  }[] = [];
  const seen = new Set<string>();

  const addEntry = (entry: (typeof entries)[number]) => {
    if (seen.has(entry.youtubeId)) return;
    seen.add(entry.youtubeId);
    entries.push(entry);
  };

  try {
    const strapiVideos = await getAllVideosForSitemap();
    for (const video of strapiVideos) {
      if (!video.youtubeId) continue;
      addEntry({
        youtubeId: video.youtubeId,
        title: video.title,
        description: video.description || `${video.title} — Wab-infos TV`,
        publishedAt: video.publishedAt,
        thumbnail:
          getStrapiMediaUrl(video.thumbnail?.url) ??
          getYoutubeThumbnailUrl(video.youtubeId),
      });
    }
  } catch {
    // Strapi unavailable
  }

  try {
    const channelId = siteConfig.youtubeChannelId;
    if (channelId) {
      const recent = await getChannelRecentVideos(channelId, 100);
      for (const video of recent) {
        addEntry({
          youtubeId: video.videoId,
          title: video.title,
          description: video.description || `${video.title} — Wab-infos TV`,
          publishedAt: video.publishedAt,
          thumbnail: getYoutubeThumbnailUrl(video.videoId),
        });
      }
    }
  } catch {
    // YouTube feed unavailable
  }

  const urls = entries
    .map((video) => {
      const pageUrl = `${siteConfig.url}${getVideoPagePath(video.youtubeId)}`;
      return `  <url>
    <loc>${escapeXml(pageUrl)}</loc>
    <video:video>
      <video:thumbnail_loc>${escapeXml(video.thumbnail)}</video:thumbnail_loc>
      <video:title>${escapeXml(video.title)}</video:title>
      <video:description>${escapeXml(video.description)}</video:description>
      <video:player_loc allow_embed="yes">${escapeXml(`https://www.youtube.com/embed/${video.youtubeId}`)}</video:player_loc>
      <video:publication_date>${video.publishedAt}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:requires_subscription>no</video:requires_subscription>
      <video:live>no</video:live>
    </video:video>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
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
