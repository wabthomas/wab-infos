import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { claimYoutubePerformance, mayClaimYoutubePerformance, myYoutubePerformances } from '@/lib/redaction/rh/youtube-performance-db';
import { fetchOfficialVideos, youtubePerformanceEnabled } from '@/lib/redaction/rh/youtube-performance-server';
import { contributionRole, youtubeVideoId } from '@/lib/redaction/rh/youtube-performance';
import { isUuid } from '@/lib/redaction/rh/activities';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!youtubePerformanceEnabled()) return json({ error: 'Module désactivé.' }, 503);
  try { return json({ performances: await myYoutubePerformances(await requireRhPrincipal()) }); }
  catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  if (!youtubePerformanceEnabled()) return json({ error: 'Module désactivé.' }, 503);
  try {
    const principal = await requireRhPrincipal();
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let data: unknown; try { data = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'Requête invalide.' }, 400);
    const input = data as Record<string, unknown>;
    const id = youtubeVideoId(input.url); const role = contributionRole(input.role);
    if (!isUuid(input.submissionId) || !id || !role) return json({ error: 'Choisissez une prestation en attente, un lien YouTube valide et votre rôle.' }, 400);
    if (!(await mayClaimYoutubePerformance(principal, input.submissionId))) return json({ error: 'Prestation indisponible ou vidéo déjà associée.' }, 409);
    const video = (await fetchOfficialVideos([id])).get(id);
    if (!video) return json({ error: 'Vidéo introuvable ou non publiée sur la chaîne officielle.' }, 400);
    if (!(await claimYoutubePerformance(principal, input.submissionId, role, video))) return json({ error: 'Prestation indisponible ou contribution déjà déclarée pour cette vidéo.' }, 409);
    return json({ ok: true }, 201);
  } catch (error) { return handleError(error); }
}
