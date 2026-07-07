import type { Video } from '@wab-infos/shared';
import { siteConfig } from '@/config/site';
import { getVideoByYoutubeId, getVideos } from '@/lib/strapi';

export interface YoutubeChannelVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  link: string;
  description?: string;
  viewCount?: number;
}

export interface ChannelLiveStatus {
  isLive: boolean;
  videoId?: string;
  title?: string;
  publishedAt?: string;
}

/** Limite d'affichage page vidéo (descriptions YouTube jusqu'à 5000 car.) */
export const VIDEO_DESCRIPTION_MAX_LENGTH = 500;

export function truncateVideoDescription(
  text: string,
  maxLength = VIDEO_DESCRIPTION_MAX_LENGTH
): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;

  const slice = trimmed.slice(0, maxLength);
  const lastBreak = Math.max(slice.lastIndexOf('\n'), slice.lastIndexOf(' '));
  const cut = lastBreak > maxLength * 0.75 ? slice.slice(0, lastBreak) : slice;
  return `${cut.trimEnd()}…`;
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
      const descriptionMatch = entry.match(/<media:description>([^<]*)<\/media:description>/);
      const link =
        entry.match(/<link rel="alternate" href="([^"]+)"/)?.[1] ??
        (videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined);

      if (videoId && titleMatch?.[1] && published) {
        videos.push({
          videoId,
          title: decodeXml(titleMatch[1]),
          publishedAt: published,
          link: link ?? `https://www.youtube.com/watch?v=${videoId}`,
          description: descriptionMatch?.[1] ? decodeXml(descriptionMatch[1]) : undefined,
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
    description: entry.description
      ? truncateVideoDescription(entry.description)
      : undefined,
    publishedAt: entry.publishedAt,
  };
}

export async function getYoutubeOembed(videoId: string): Promise<{
  title: string;
  authorName: string;
  thumbnailUrl: string;
} | null> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { next: { revalidate: 3600 } }
    );
    if (!response.ok) return null;

    const data = (await response.json()) as {
      title: string;
      author_name: string;
      thumbnail_url: string;
    };

    return {
      title: data.title,
      authorName: data.author_name,
      thumbnailUrl: data.thumbnail_url,
    };
  } catch {
    return null;
  }
}

export async function getYoutubeVideoFromApi(videoId: string): Promise<{
  title: string;
  description?: string;
  publishedAt: string;
} | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('id', videoId);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      items?: { snippet: { title: string; description?: string; publishedAt: string } }[];
    };

    const snippet = data.items?.[0]?.snippet;
    if (!snippet?.publishedAt) return null;

    return {
      title: snippet.title,
      description: snippet.description
        ? truncateVideoDescription(snippet.description)
        : undefined,
      publishedAt: snippet.publishedAt,
    };
  } catch {
    return null;
  }
}

export function isValidVideoPublishedAt(publishedAt: string | undefined): publishedAt is string {
  if (!publishedAt) return false;
  return !Number.isNaN(Date.parse(publishedAt));
}

/** Affichage compact du nombre de vues YouTube (fr-FR). */
export function formatYoutubeViewCount(count: number): string {
  if (!Number.isFinite(count) || count < 0) return '';
  if (count >= 1_000_000) {
    const millions = count / 1_000_000;
    const rounded = millions >= 10 ? Math.round(millions) : Math.round(millions * 10) / 10;
    return `${rounded.toLocaleString('fr-FR')} M vues`;
  }
  if (count >= 10_000) {
    return `${Math.round(count / 1000).toLocaleString('fr-FR')} k vues`;
  }
  if (count >= 1_000) {
    const thousands = Math.round((count / 1000) * 10) / 10;
    return `${thousands.toLocaleString('fr-FR')} k vues`;
  }
  return `${count.toLocaleString('fr-FR')} vue${count > 1 ? 's' : ''}`;
}

export async function getYoutubeVideoStatistics(videoIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || !videoIds.length) return map;

  const unique = [...new Set(videoIds.filter((id) => /^[a-zA-Z0-9_-]{11}$/.test(id)))];
  if (!unique.length) return map;

  for (let offset = 0; offset < unique.length; offset += 50) {
    const batch = unique.slice(offset, offset + 50);
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/videos');
      url.searchParams.set('part', 'statistics');
      url.searchParams.set('id', batch.join(','));
      url.searchParams.set('key', apiKey);

      const response = await fetch(url, { next: { revalidate: 600 } });
      if (!response.ok) continue;

      const data = (await response.json()) as {
        items?: { id: string; statistics?: { viewCount?: string } }[];
      };

      for (const item of data.items ?? []) {
        const views = Number(item.statistics?.viewCount);
        if (item.id && Number.isFinite(views)) {
          map.set(item.id, views);
        }
      }
    } catch {
      // ignore batch errors
    }
  }

  return map;
}

export async function getYoutubeVideoViewCount(videoId: string): Promise<number | undefined> {
  const stats = await getYoutubeVideoStatistics([videoId]);
  return stats.get(videoId);
}

export async function enrichVideosWithViewCounts<T extends { youtubeId: string; viewCount?: number }>(
  videos: T[]
): Promise<T[]> {
  if (!videos.length) return videos;
  const stats = await getYoutubeVideoStatistics(videos.map((video) => video.youtubeId));
  if (!stats.size) return videos;

  return videos.map((video) => {
    const viewCount = stats.get(video.youtubeId);
    return viewCount != null ? { ...video, viewCount } : video;
  });
}

export async function enrichYoutubeChannelVideos(
  videos: YoutubeChannelVideo[]
): Promise<YoutubeChannelVideo[]> {
  if (!videos.length) return videos;
  const stats = await getYoutubeVideoStatistics(videos.map((video) => video.videoId));
  if (!stats.size) return videos;

  return videos.map((video) => {
    const viewCount = stats.get(video.videoId);
    return viewCount != null ? { ...video, viewCount } : video;
  });
}

export async function resolveVideoByYoutubeId(youtubeId: string): Promise<Video | null> {
  try {
    const fromStrapi = await getVideoByYoutubeId(youtubeId);
    if (fromStrapi) return fromStrapi;
  } catch {
    // Strapi indisponible
  }

  const fromApi = await getYoutubeVideoFromApi(youtubeId);
  if (fromApi) {
    return {
      id: 0,
      documentId: `yt-${youtubeId}`,
      title: fromApi.title,
      slug: youtubeId,
      description: truncateVideoDescription(
        fromApi.description || `${fromApi.title} — Wab-infos TV`
      ),
      youtubeId,
      type: 'replay',
      publishedAt: fromApi.publishedAt,
    };
  }

  const channelId = siteConfig.youtubeChannelId;
  if (channelId) {
    const recent = await getChannelRecentVideos(channelId, 50);
    const fromFeed = recent.find((entry) => entry.videoId === youtubeId);
    if (fromFeed) return youtubeVideoToTvVideo(fromFeed, 'replay');
  }

  const oembed = await getYoutubeOembed(youtubeId);
  if (!oembed) return null;

  // oEmbed ne fournit pas la date — pas de publishedAt inventée
  return {
    id: 0,
    documentId: `yt-${youtubeId}`,
    title: oembed.title,
    slug: youtubeId,
    description: `Vidéo de ${oembed.authorName} sur Wab-infos TV`,
    youtubeId,
    type: 'replay',
    publishedAt: '',
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
