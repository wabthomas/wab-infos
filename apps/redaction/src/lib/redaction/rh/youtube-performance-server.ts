import 'server-only';
import { officialVideoItems, type YoutubeCounts } from './youtube-performance';

export type OfficialVideo = YoutubeCounts & { videoId: string; title: string };
export function youtubePerformanceEnabled(): boolean { return process.env.REDACTION_RH_YOUTUBE_ENABLED === 'true'; }
const idPattern = /^[a-zA-Z0-9_-]{11}$/;
const channelPattern = /^UC[a-zA-Z0-9_-]{22}$/;

/** Appel côté serveur exclusivement. Ne jamais accepter une URL hôte provenant du client (SSRF). */
export async function fetchOfficialVideos(ids: string[]): Promise<Map<string, OfficialVideo>> {
  const key = process.env.YOUTUBE_API_KEY;
  const channel = process.env.REDACTION_RH_YOUTUBE_CHANNEL_ID || process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;
  if (!key || !channel || !channelPattern.test(channel)) throw new Error('YouTube RH non configuré.');
  if (!ids.length || ids.length > 50 || ids.some(id => !idPattern.test(id))) throw new Error('Identifiant YouTube invalide.');
  const params = new URLSearchParams({ part: 'snippet,statistics', id: ids.join(','), key });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('YouTube indisponible : réessayez plus tard.');
  return officialVideoItems(await response.json(), ids, channel);
}
