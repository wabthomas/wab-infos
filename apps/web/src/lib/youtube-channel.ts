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

function parseYoutubeFeed(xml: string, limit: number): YoutubeChannelVideo[] {
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
}

async function fetchYoutubeFeed(
  feedUrl: string,
  limit: number,
  revalidate = 600
): Promise<YoutubeChannelVideo[]> {
  try {
    const response = await fetch(feedUrl, { next: { revalidate } });
    if (!response.ok) return [];
    return parseYoutubeFeed(await response.text(), limit);
  } catch {
    return [];
  }
}

export async function getChannelRecentVideos(
  channelId: string,
  limit = 12
): Promise<YoutubeChannelVideo[]> {
  return fetchYoutubeFeed(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
    limit,
    300
  );
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

interface YoutubeVideoMeta {
  viewCount?: number;
  publishedAt?: string;
}

/** Vues et date de mise en ligne (pas la date d'ajout à une playlist). */
async function getYoutubeVideoMeta(videoIds: string[]): Promise<Map<string, YoutubeVideoMeta>> {
  const map = new Map<string, YoutubeVideoMeta>();
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || !videoIds.length) return map;

  const unique = [...new Set(videoIds.filter((id) => /^[a-zA-Z0-9_-]{11}$/.test(id)))];
  if (!unique.length) return map;

  for (let offset = 0; offset < unique.length; offset += 50) {
    const batch = unique.slice(offset, offset + 50);
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/videos');
      url.searchParams.set('part', 'snippet,statistics');
      url.searchParams.set('id', batch.join(','));
      url.searchParams.set('key', apiKey);

      const response = await fetch(url, { next: { revalidate: 600 } });
      if (!response.ok) continue;

      const data = (await response.json()) as {
        items?: {
          id: string;
          snippet?: { publishedAt?: string };
          statistics?: { viewCount?: string };
        }[];
      };

      for (const item of data.items ?? []) {
        if (!item.id) continue;
        const views = Number(item.statistics?.viewCount);
        map.set(item.id, {
          viewCount: Number.isFinite(views) ? views : undefined,
          publishedAt: item.snippet?.publishedAt,
        });
      }
    } catch {
      // ignore batch errors
    }
  }

  return map;
}

export async function getYoutubeVideoStatistics(videoIds: string[]): Promise<Map<string, number>> {
  const meta = await getYoutubeVideoMeta(videoIds);
  const map = new Map<string, number>();
  for (const [id, item] of meta) {
    if (item.viewCount != null) map.set(id, item.viewCount);
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
  const meta = await getYoutubeVideoMeta(videos.map((video) => video.videoId));
  if (!meta.size) return videos;

  return videos.map((video) => {
    const item = meta.get(video.videoId);
    if (!item) return video;
    return {
      ...video,
      viewCount: item.viewCount ?? video.viewCount,
      publishedAt: item.publishedAt || video.publishedAt,
    };
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
  channelId: string,
  limit = 12
): Promise<Video[]> {
  if (tab === 'live') return [];

  try {
    const strapiVideos = await getVideos({ type: tab, pageSize: limit });
    if (strapiVideos.length > 0) return strapiVideos;
  } catch {
    // Strapi indisponible ou vide — repli YouTube
  }

  if (!channelId) return [];

  const recent = await getChannelRecentVideos(channelId, Math.min(limit, 15));
  return recent.map((entry) => youtubeVideoToTvVideo(entry, tab));
}

export interface YoutubePlaylist {
  id: string;
  title: string;
  /** Libellé YouTube, ex. « 12 vidéos » */
  videoCountLabel?: string;
  videos: YoutubeChannelVideo[];
}

export type YoutubePlaylistTab = 'replay' | 'emission' | 'podcast';

const PLAYLIST_VIDEO_LIMIT = 16;
const LATEST_UPLOADS_LIMIT = 24;

/** Onglet TV d'une playlist, d'après son titre YouTube. */
export function classifyYoutubePlaylist(title: string): YoutubePlaylistTab {
  const normalized = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (/\bpodcasts?\b|\baudio\b/.test(normalized)) return 'podcast';
  if (/emission|journal|dossier|decrypt|debat|magazine|interview|samedi/.test(normalized)) {
    return 'emission';
  }
  return 'replay';
}

interface PlaylistMeta {
  id: string;
  title: string;
  videoCountLabel?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function findVideoCountLabel(node: unknown): string | undefined {
  if (typeof node === 'string') {
    const match = node.match(/(\d[\d\s\u00a0]*)\s*vid[ée]os/i);
    return match ? `${match[1].replace(/[\s\u00a0]/g, '')} vidéos` : undefined;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findVideoCountLabel(item);
      if (found) return found;
    }
    return undefined;
  }
  const record = asRecord(node);
  if (!record) return undefined;
  for (const value of Object.values(record)) {
    const found = findVideoCountLabel(value);
    if (found) return found;
  }
  return undefined;
}

function collectPlaylistLockups(
  node: unknown,
  out: PlaylistMeta[],
  contentType = 'LOCKUP_CONTENT_TYPE_PLAYLIST'
) {
  if (Array.isArray(node)) {
    for (const item of node) collectPlaylistLockups(item, out, contentType);
    return;
  }
  const record = asRecord(node);
  if (!record) return;

  if (record.contentType === contentType && typeof record.contentId === 'string') {
    const metadata = asRecord(record.metadata);
    const lockup = asRecord(metadata?.lockupMetadataViewModel);
    const titleObj = asRecord(lockup?.title);
    const title = typeof titleObj?.content === 'string' ? titleObj.content.trim() : '';
    if (title) {
      out.push({
        id: record.contentId,
        title,
        videoCountLabel: findVideoCountLabel(record),
      });
    }
  }

  for (const value of Object.values(record)) collectPlaylistLockups(value, out, contentType);
}

function dedupePlaylists(playlists: PlaylistMeta[]): PlaylistMeta[] {
  const seen = new Set<string>();
  return playlists.filter((playlist) => {
    if (!playlist.id || seen.has(playlist.id)) return false;
    seen.add(playlist.id);
    return true;
  });
}

function dedupeVideos(videos: YoutubeChannelVideo[]): YoutubeChannelVideo[] {
  const seen = new Set<string>();
  return videos.filter((video) => {
    if (seen.has(video.videoId)) return false;
    seen.add(video.videoId);
    return true;
  });
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]);
    }
  }

  const workers = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

async function listPlaylistsFromApi(channelId: string, apiKey: string): Promise<PlaylistMeta[]> {
  const all: PlaylistMeta[] = [];
  let pageToken = '';

  for (let page = 0; page < 2; page += 1) {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlists');
    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('channelId', channelId);
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('key', apiKey);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url, { next: { revalidate: 600 } });
    if (!response.ok) return all;

    const data = (await response.json()) as {
      nextPageToken?: string;
      items?: {
        id?: string;
        snippet?: { title?: string };
        contentDetails?: { itemCount?: number };
      }[];
    };

    for (const item of data.items ?? []) {
      const title = item.snippet?.title?.trim();
      if (!item.id || !title) continue;
      const count = item.contentDetails?.itemCount;
      all.push({
        id: item.id,
        title,
        videoCountLabel: count != null ? `${count} vidéos` : undefined,
      });
    }

    pageToken = data.nextPageToken ?? '';
    if (!pageToken) break;
  }

  return dedupePlaylists(all);
}

async function browseChannelLockups(
  channelId: string,
  params: string,
  contentType: string
): Promise<PlaylistMeta[]> {
  try {
    const response = await fetch('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'fr-FR',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20241001.00.00',
            hl: 'fr',
            gl: 'FR',
          },
        },
        browseId: channelId,
        params,
      }),
      next: { revalidate: 600 },
    });
    if (!response.ok) return [];

    const data: unknown = await response.json();
    const found: PlaylistMeta[] = [];
    collectPlaylistLockups(data, found, contentType);
    return dedupePlaylists(found);
  } catch {
    return [];
  }
}

/** Repli sans clé API : onglet Playlists public de la chaîne. */
async function listPlaylistsFromChannel(channelId: string): Promise<PlaylistMeta[]> {
  return browseChannelLockups(
    channelId,
    'EglwbGF5bGlzdHPyBgQKAkIA',
    'LOCKUP_CONTENT_TYPE_PLAYLIST'
  );
}

/** Émissions marquées podcast sur la chaîne (onglet Podcasts YouTube). */
async function listPodcastsFromChannel(channelId: string): Promise<PlaylistMeta[]> {
  return browseChannelLockups(
    channelId,
    'Eghwb2RjYXN0c_IGBQoDugEA',
    'LOCKUP_CONTENT_TYPE_PODCAST'
  );
}

function isHiddenPlaylistVideo(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  return (
    normalized === 'private video' ||
    normalized === 'deleted video' ||
    normalized === 'vidéo privée' ||
    normalized === 'vidéo supprimée'
  );
}

async function getPlaylistVideosFromApi(
  playlistId: string,
  apiKey: string,
  limit: number
): Promise<YoutubeChannelVideo[]> {
  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('playlistId', playlistId);
    url.searchParams.set('maxResults', String(Math.min(limit, 50)));
    url.searchParams.set('key', apiKey);

    const response = await fetch(url, { next: { revalidate: 600 } });
    if (!response.ok) return [];

    const data = (await response.json()) as {
      items?: {
        snippet?: {
          title?: string;
          description?: string;
          publishedAt?: string;
          resourceId?: { videoId?: string };
        };
      }[];
    };

    const videos: YoutubeChannelVideo[] = [];
    for (const item of data.items ?? []) {
      const snippet = item.snippet;
      const videoId = snippet?.resourceId?.videoId;
      const title = snippet?.title?.trim();
      if (!videoId || !title || isHiddenPlaylistVideo(title) || !snippet.publishedAt) continue;
      videos.push({
        videoId,
        title,
        publishedAt: snippet.publishedAt,
        link: `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`,
        description: snippet.description
          ? truncateVideoDescription(snippet.description)
          : undefined,
      });
      if (videos.length >= limit) break;
    }
    return videos;
  } catch {
    return [];
  }
}

async function getPlaylistVideos(
  playlistId: string,
  apiKey: string | undefined,
  limit: number
): Promise<YoutubeChannelVideo[]> {
  if (apiKey) {
    const fromApi = await getPlaylistVideosFromApi(playlistId, apiKey, limit);
    if (fromApi.length) return fromApi;
  }

  return fetchYoutubeFeed(
    `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`,
    Math.min(limit, 15)
  );
}

/** Dernières mises en ligne : jusqu'à 24 via l'API, sinon le flux RSS (15 max). */
export async function getChannelLatestVideos(
  channelId: string,
  limit = LATEST_UPLOADS_LIMIT
): Promise<YoutubeChannelVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey && channelId.startsWith('UC')) {
    const uploads = await getPlaylistVideosFromApi(`UU${channelId.slice(2)}`, apiKey, limit);
    if (uploads.length) return uploads;
  }
  return getChannelRecentVideos(channelId, Math.min(limit, 15));
}

const TITLE_ACCENT_FIXES: [string, string][] = [
  ['actualites', 'actualités'],
  ['actualite', 'actualité'],
  ['decouvertes', 'découvertes'],
  ['decouverte', 'découverte'],
  ['societe', 'société'],
  ['securitaire', 'sécuritaire'],
  ['securite', 'sécurité'],
  ['emissions', 'émissions'],
  ['emission', 'émission'],
  ['decryptage', 'décryptage'],
  ['a la une', 'à la une'],
];

const TITLE_ACRONYMS = ['RDC', 'TV', 'ONU', 'FIFA', 'CAN', 'M23', 'FARDC', 'RDF', 'AFC', 'USA', 'UE', 'FDLR', 'CENCO'];

function stripTitleDecorations(title: string): string {
  return title
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Titre lisible : les intitulés YouTube tout en capitales passent en casse de phrase. */
export function formatDisplayTitle(title: string): string {
  const cleaned = stripTitleDecorations(title);
  if (!cleaned) return title.trim();

  const letters = cleaned.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
  const uppers = (cleaned.match(/[A-ZÀ-ÖØ-Þ]/g) ?? []).length;
  if (!letters || uppers / letters.length < 0.6) return cleaned;

  let sentence = cleaned.toLocaleLowerCase('fr-FR');
  for (const [from, replacement] of TITLE_ACCENT_FIXES) {
    sentence = sentence.replace(new RegExp(`\\b${from}\\b`, 'g'), replacement);
  }
  sentence = sentence.charAt(0).toLocaleUpperCase('fr-FR') + sentence.slice(1);
  for (const acronym of TITLE_ACRONYMS) {
    sentence = sentence.replace(new RegExp(`\\b${acronym}\\b`, 'gi'), acronym);
  }
  sentence = sentence.replace(/\bwab[\s-]*infos\b/gi, 'Wab-infos');
  sentence = sentence.replace(/\bwab[\s-]*sport\b/gi, 'Wab-sport');
  return sentence;
}

function playlistPlainTitle(title: string): string {
  return stripTitleDecorations(title)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Regroupe les playlists qui disent la même chose (actus chaudes, sport, etc.). */
function playlistThemeKey(title: string): string {
  const plain = playlistPlainTitle(title);
  if (/chaud/.test(plain) && /actu/.test(plain)) return 'actus-chaudes';
  if (/sport/.test(plain)) return 'sport';
  if (/humour/.test(plain)) return 'humour';
  if (/gospel/.test(plain)) return 'gospel';
  if (/\b(clips?|musiques?|music)\b/.test(plain)) return 'musique';
  if (/secur/.test(plain)) return 'securite';
  if (/decouver|technolog/.test(plain)) return 'decouvertes';
  if (/decrypt/.test(plain)) return 'decryptage';
  if (/\bjournal\b/.test(plain)) return 'journal';
  if (/dossier/.test(plain)) return 'dossiers';
  if (/samedi/.test(plain)) return 'samedi';
  if (/populaire/.test(plain)) return 'populaires';
  if (/a la une/.test(plain) || /^actualites?$/.test(plain)) return 'a-la-une';
  return plain;
}

const SHORT_PLAYLIST_TITLES: Record<string, string> = {
  'actus-chaudes': 'Actus chaudes',
  sport: 'Sport',
  humour: 'Humour',
  gospel: 'Gospel',
  musique: 'Musique',
  securite: 'Sécurité',
  decouvertes: 'Découvertes',
  decryptage: 'Décryptage',
  journal: 'Journal',
  dossiers: 'Dossiers',
  samedi: 'Samedi sain',
  populaires: 'Populaires',
  'a-la-une': 'À la une',
};

function shortPlaylistTitle(title: string): string {
  const known = SHORT_PLAYLIST_TITLES[playlistThemeKey(title)];
  if (known) return known;

  let text = formatDisplayTitle(title)
    .replace(/^rdc\s*:\s*/i, '')
    .replace(/\s*\|\s*wab-sport/i, '')
    .replace(/\s+sur\s+wab-infos(?:\s+tv)?/i, '')
    .replace(/\s+wab-infos(?:\s+tv)?/i, '')
    .trim();

  const clause = text.split(/\s+[|–—-]\s+/)[0]?.trim();
  if (clause && clause.length < text.length && clause.length >= 3) text = clause;
  if (text.length <= 28) return text;

  const words = text.split(/\s+/).slice(0, 3);
  return words.join(' ');
}

function playlistSize(playlist: YoutubePlaylist): number {
  const labeled = Number(playlist.videoCountLabel?.match(/(\d+)/)?.[1]);
  return Math.max(Number.isFinite(labeled) ? labeled : 0, playlist.videos.length);
}

function presentPlaylist(playlist: YoutubePlaylist): YoutubePlaylist {
  return {
    ...playlist,
    title: shortPlaylistTitle(playlist.title),
    videos: playlist.videos.map((video) => ({
      ...video,
      title: formatDisplayTitle(video.title),
    })),
  };
}

/** Une seule rubrique par thème, et on écarte celles qui rediffusent les mêmes vidéos. */
function collapseRedundantPlaylists(playlists: YoutubePlaylist[]): YoutubePlaylist[] {
  const richestByTheme = new Map<string, YoutubePlaylist>();
  for (const playlist of playlists) {
    const theme = playlistThemeKey(playlist.title);
    const current = richestByTheme.get(theme);
    if (!current || playlistSize(playlist) > playlistSize(current)) {
      richestByTheme.set(theme, playlist);
    }
  }
  const chosenIds = new Set([...richestByTheme.values()].map((playlist) => playlist.id));

  const kept: YoutubePlaylist[] = [];
  const seenVideoIds = new Set<string>();
  for (const playlist of playlists) {
    if (!chosenIds.has(playlist.id)) continue;
    const overlap = playlist.videos.filter((video) => seenVideoIds.has(video.videoId)).length;
    if (playlist.videos.length > 0 && overlap / playlist.videos.length >= 0.45) continue;
    kept.push(presentPlaylist(playlist));
    for (const video of playlist.videos) seenVideoIds.add(video.videoId);
  }
  return kept;
}

/** Playlists de la chaîne pour un onglet TV, avec leurs vidéos. */
export async function getChannelPlaylistsForTab(
  channelId: string,
  tab: YoutubePlaylistTab
): Promise<YoutubePlaylist[]> {
  if (!channelId) return [];

  const apiKey = process.env.YOUTUBE_API_KEY;
  let metas: PlaylistMeta[] = [];

  if (tab === 'podcast') {
    metas = await listPodcastsFromChannel(channelId);
  } else {
    if (apiKey) {
      try {
        metas = await listPlaylistsFromApi(channelId, apiKey);
      } catch {
        metas = [];
      }
    }
    if (!metas.length) {
      metas = await listPlaylistsFromChannel(channelId);
    }
    metas = metas.filter((playlist) => classifyYoutubePlaylist(playlist.title) === tab);
  }

  if (!metas.length) return [];

  const withVideos = await mapPool(metas, 4, async (playlist) => {
    const videos = dedupeVideos(
      await getPlaylistVideos(playlist.id, apiKey, PLAYLIST_VIDEO_LIMIT)
    ).slice(0, PLAYLIST_VIDEO_LIMIT);
    return { ...playlist, videos };
  });

  const filled = withVideos.filter((playlist) => playlist.videos.length > 0);
  if (tab === 'podcast') return filled.map(presentPlaylist);
  return collapseRedundantPlaylists(filled);
}
