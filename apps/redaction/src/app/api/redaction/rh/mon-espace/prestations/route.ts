import { parseHistoryQuery } from '@/lib/redaction/rh/personal-history';
import { offlineRecordedAt } from '@/lib/redaction/rh/offline-time';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator, listMySubmissions, createMySubmission, cancelMySubmission } from '@/lib/redaction/rh/database';
import { isUuid, kinshasaToday } from '@/lib/redaction/rh/activities';
import { validateSubmission } from '@/lib/redaction/rh/submissions';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    const query = parseHistoryQuery(request.url);
    if (!query) return json({ error: 'Filtre historique invalide.' }, 400);
    if (!(await getMyCollaborator(principal))) return json({ error: 'Aucun dossier RH actif lié à ce compte.' }, 403);
    return json(await listMySubmissions(principal, query));
  } catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const input = validateSubmission(body, kinshasaToday());
    if (!input) return json({ error: 'Vérifiez la date et la description.' }, 400);
    const data = body as Record<string, unknown>;
    const offline = data.recordedAt === undefined && data.clientId === undefined ? undefined :
      typeof data.clientId === 'string' && isUuid(data.clientId) && offlineRecordedAt(data.recordedAt)
        ? { id: data.clientId, recordedAt: offlineRecordedAt(data.recordedAt)! } : null;
    if (offline === null) return json({ error: 'Données hors ligne invalides.' }, 400);
    const submission = await createMySubmission(principal, input, offline);
    if (!submission) return json({ error: 'Dossier indisponible ou relevé déjà enregistré ou en attente pour cette date.' }, 409);
    return json({ submission }, 201);
  } catch (error) { return handleError(error); }
}
export async function PATCH(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const data = body as Record<string, unknown>;
    if (data.action !== 'cancel' || !isUuid(data.id) || !Number.isSafeInteger(data.version) || Number(data.version) < 1) return json({ error: 'Requête invalide.' }, 400);
    if (!(await cancelMySubmission(principal, data.id, Number(data.version)))) return json({ error: 'Déclaration introuvable, modifiée ou non annulable. Actualisez la page.' }, 409);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
