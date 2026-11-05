/** Données publiques YouTube : elles ne sont ni un relevé de revenus ni une preuve de travail individuel. */
export type YoutubeCounts = { views: string | null; likes: string | null; comments: string | null };
export interface YoutubePerformance extends YoutubeCounts {
  id: string; videoId: string; url: string; title: string; role: string;
  collaboratorId: string; collaboratorName?: string; submissionId: string; submissionDate: string;
  submissionStatus: string; submissionVersion: number; status: 'pending' | 'approved' | 'rejected';
  note: string; checkedAt: string | null; unavailableAt: string | null; bonusMinor: string; bonusCurrency: 'USD' | 'CDF';
  bonusNote: string; version: number;
}

export function youtubeVideoId(link: unknown): string | null {
  if (typeof link !== 'string' || link.length > 300) return null;
  try {
    const url = new URL(link.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (host === 'www.youtube.com' || host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else if (/^\/(shorts|live|embed)\/[a-zA-Z0-9_-]{11}\/?$/.test(url.pathname)) id = url.pathname.split('/')[2];
    } else if (host === 'youtu.be' || host === 'www.youtu.be') {
      if (/^\/[a-zA-Z0-9_-]{11}\/?$/.test(url.pathname)) id = url.pathname.split('/')[1];
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function contributionRole(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const role = value.trim();
  return role.length > 1 && role.length <= 80 && !/[\u0000-\u001f\u007f]/.test(role) ? role : null;
}

/** Le bonus est une décision motivée de l'admin, jamais un revenu déduit des vues. */
export function bonusDecision(input: unknown): { amount: string; currency: 'USD' | 'CDF'; note: string } | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const v = input as Record<string, unknown>;
  if (typeof v.amount !== 'string' || !/^(0|[1-9]\d{0,17})$/.test(v.amount) || (v.currency !== 'USD' && v.currency !== 'CDF') || typeof v.note !== 'string') return null;
  const note = v.note.trim();
  if (note.length > 500 || /[\u0000-\u001f\u007f]/.test(note) || !note) return null;
  return { amount: v.amount, currency: v.currency, note };
}

export function youtubeCount(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{1,18}$/.test(value)) return null;
  return BigInt(value).toString();
}

/** Réduit une réponse vidéos.list aux seules vidéos de la chaîne configurée. */
export function officialVideoItems(data: unknown, ids: readonly string[], channel: string): Map<string, { videoId: string; title: string } & YoutubeCounts> {
  if (!data || typeof data !== 'object' || !Array.isArray((data as {items?: unknown}).items)) throw new Error('Réponse YouTube invalide.');
  const found = new Map<string, { videoId: string; title: string } & YoutubeCounts>();
  for (const value of (data as { items: unknown[] }).items) {
    if (!value || typeof value !== 'object') continue;
    const item = value as { id?: unknown; snippet?: { channelId?: unknown; title?: unknown }; statistics?: { viewCount?: unknown; likeCount?: unknown; commentCount?: unknown } };
    if (typeof item.id !== 'string' || !ids.includes(item.id) || item.snippet?.channelId !== channel) continue;
    found.set(item.id, { videoId: item.id, title: (typeof item.snippet.title === 'string' ? item.snippet.title : 'Vidéo YouTube').slice(0, 200), views: youtubeCount(item.statistics?.viewCount), likes: youtubeCount(item.statistics?.likeCount), comments: youtubeCount(item.statistics?.commentCount) });
  }
  return found;
}
