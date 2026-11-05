import { timingSafeEqual } from 'node:crypto';
import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { refreshYoutubeVideos } from '@/lib/redaction/rh/youtube-performance-db';
import { fetchOfficialVideos, youtubePerformanceEnabled } from '@/lib/redaction/rh/youtube-performance-server';
import { json, handleError, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';

/** Tâche planifiée : jeton distinct de la clé YouTube, jamais exposé au navigateur. */
export async function GET(request: Request) {
  if (!youtubePerformanceEnabled()) return json({ error: 'Module désactivé.' }, 503);
  const secret = process.env.REDACTION_RH_YOUTUBE_CRON_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  if (!secret || secret.length < 32) return json({ error: 'Actualisation planifiée non configurée.' }, 503);
  const a = Buffer.from(secret); const b = Buffer.from(supplied);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return json({ error: 'Non autorisé.' }, 401);
  try { return json({ refreshed: await refreshYoutubeVideos(fetchOfficialVideos) }); }
  catch (error) { return handleError(error); }
}

export async function POST(request: Request) {
  if (!youtubePerformanceEnabled()) return json({ error: 'Module désactivé.' }, 503);
  try {
    await requireRhPermission('hr_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    return json({ refreshed: await refreshYoutubeVideos(fetchOfficialVideos) });
  } catch (error) { return handleError(error); }
}
