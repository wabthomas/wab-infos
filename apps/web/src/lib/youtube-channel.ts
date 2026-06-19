import type { Video } from '@wab-infos/shared';
import { getVideos } from '@/lib/strapi';

export interface YoutubeChannelVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  link: string;
}

export interface ChannelLiveStatus {
  isLive: boolean;
  videoId?: string;
  title?: string;
  publishedAt?: string;
}

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

export async function getChannelRecentVideos(
  channelId: string,
  limit = 12
): Promise<YoutubeChannelVideo[]> {
  try {
    const response = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) return [];

    const xml = await response.text();
    const entries = xml.split('<entry>').slice(1);
    const videos: YoutubeChannelVideo[] = [];

    for (const entry of entries.slice(0, limit)) {
      const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
      const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
      const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
      const link =
        entry.match(/<link rel="alternate" href="([^"]+)"/)?.[1] ??
        (videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined);

      if (videoId && titleMatch?.[1] && published) {
        videos.push({
          videoId,
          title: decodeXml(titleMatch[1]),
          publishedAt: published,
          link: link ?? `https://www.youtube.com/watch?v=${videoId}`,
        });
      }
    }

    return videos;
  } catch {
    return [];
  }
}

export async function getChannelLiveStatus(channelId: string): Promise<ChannelLiveStatus> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { isLive: false };

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('channelId', channelId);
    url.searchParams.set('eventType', 'live');
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', '1');
    url.searchParams.set('key', apiKey);

    const response = await fetch(url, { next: { revalidate: 60 } });
    if (!response.ok) return { isLive: false };

    const data = (await response.json()) as {
      items?: {
        id: { videoId: string };
        snippet: { title: string; publishedAt?: string };
      }[];
    };

    const live = data.items?.[0];
    if (!live?.id?.videoId) return { isLive: false };

    return {
      isLive: true,
      videoId: live.id.videoId,
      title: live.snippet.title,
      publishedAt: live.snippet.publishedAt,
    };
  } catch {
    return { isLive: false };
  }
}

export function youtubeVideoToTvVideo(
  entry: YoutubeChannelVideo,
  type: Video['type']
): Video {
  return {
    id: 0,
    documentId: `yt-${entry.videoId}`,
    title: entry.title,
    slug: entry.videoId,
    youtubeId: entry.videoId,
    type,
    publishedAt: entry.publishedAt,
  };
}

export async function getTvTabVideos(
  tab: Video['type'],
  channelId: string
): Promise<Video[]> {
  if (tab === 'live') return [];

  try {
    const strapiVideos = await getVideos({ type: tab, pageSize: 12 });
    if (strapiVideos.length > 0) return strapiVideos;
  } catch {
    // Strapi indisponible ou vide — repli YouTube
  }

  if (!channelId) return [];

  const recent = await getChannelRecentVideos(channelId, 12);
  return recent.map((entry) => youtubeVideoToTvVideo(entry, tab));
}
