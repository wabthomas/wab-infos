import { parseHistoryQuery } from '@/lib/redaction/rh/personal-history';
import { offlineRecordedAt } from '@/lib/redaction/rh/offline-time';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { listMyAttendance, signMyAttendance } from '@/lib/redaction/rh/extras-db';
import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    const query = parseHistoryQuery(request.url);
    if (!query) return json({ error: 'Filtre historique invalide.' }, 400);
    return json(await listMyAttendance(principal, query));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown;
    try {
      body = await readBody(request);
    } catch {
      return json({ error: 'Requête invalide.' }, 400);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const action = (body as Record<string, unknown>).action;
    if (action !== 'in' && action !== 'out') return json({ error: 'Action invalide.' }, 400);
    const recordedAt = (body as Record<string, unknown>).recordedAt;
    const time = recordedAt === undefined ? undefined : offlineRecordedAt(recordedAt);
    if (recordedAt !== undefined && !time) return json({ error: 'Heure hors ligne invalide ou trop ancienne.' }, 400);
    const row = await signMyAttendance(principal, action, time ?? undefined);
    if (!row) return json({ error: 'Pointage impossible (déjà signé ou dossier introuvable).' }, 409);
    return json({ attendance: row });
  } catch (error) {
    return handleError(error);
  }
}
