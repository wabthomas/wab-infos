import { getRhFlags } from '@/lib/redaction/rh/flags';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator, db } from '@/lib/redaction/rh/database';
import { youtubePerformanceEnabled } from '@/lib/redaction/rh/youtube-performance-server';
import { RH_RELEASES, findRhRelease } from '@/lib/redaction/rh/releases';
import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    if (!(await getMyCollaborator(principal))) return json({ error: 'Dossier RH indisponible.' }, 403);
    const flags = await getRhFlags();
    const release = RH_RELEASES.find((item) => (!item.requiresWithdrawals || flags.withdrawalsEnabled) && (!item.requiresContracts || flags.contractsEnabled) && (!item.requiresYoutube || youtubePerformanceEnabled()));
    if (!release) return json({ release: null });
    const result = await db().query(
      'SELECT 1 FROM redaction_rh.release_acknowledgements WHERE account_id=$1 AND release_id=$2',
      [principal.id, release.id]
    );
    return json({ release: result.rowCount ? null : release });
  } catch (error) { return handleError(error); }
}

export async function POST(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    if (!(await getMyCollaborator(principal))) return json({ error: 'Dossier RH indisponible.' }, 403);
    let body: unknown;
    try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof (body as { id?: unknown }).id !== 'string') return json({ error: 'Annonce invalide.' }, 400);
    const release = findRhRelease((body as { id: string }).id);
    if (!release) return json({ error: 'Annonce introuvable.' }, 404);
    await db().query('INSERT INTO redaction_rh.release_acknowledgements(account_id,release_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [principal.id, release.id]);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
