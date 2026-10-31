import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { kinshasaToday, isValidDate, isUuid } from '@/lib/redaction/rh/activities';
import { validateAttendanceCorrection } from '@/lib/redaction/rh/attendance';
import { correctTeamAttendance, decideAttendanceCorrection, listTeamAttendanceCorrections } from '@/lib/redaction/rh/attendance-corrections-db';
import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireRhPermission('hr_manage');
    const params = new URL(request.url).searchParams;
    const from = params.get('from'); const to = params.get('to');
    const status = params.get('status') ?? 'pending';
    const days = from && to ? (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1 : NaN;
    if (!isValidDate(from) || !isValidDate(to) || from > to || days > 366 || !['pending', 'approved', 'rejected', 'all'].includes(status)) {
      return json({ error: 'Période ou filtre invalide.' }, 400);
    }
    return json({ corrections: await listTeamAttendanceCorrections(from, to, status as 'pending' | 'approved' | 'rejected' | 'all') });
  } catch (error) { return handleError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRhPermission('hr_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const data = body as Record<string, unknown>;
    if (!isUuid(data.collaboratorId)) return json({ error: 'Collaborateur invalide.' }, 400);
    const input = validateAttendanceCorrection(data, kinshasaToday());
    if (!input) return json({ error: 'Vérifiez la date, les heures et le motif (8 à 500 caractères). La correction doit concerner les cinq dernières années.' }, 400);
    const attendance = await correctTeamAttendance({ ...input, collaboratorId: data.collaboratorId }, actor.email);
    if (!attendance) return json({ error: 'Dossier introuvable, demande en attente ou heures incompatibles avec le pointage existant.' }, 409);
    return json({ attendance });
  } catch (error) { return handleError(error); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireRhPermission('hr_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const data = body as Record<string, unknown>;
    const decision = data.decision;
    const note = typeof data.note === 'string' ? data.note.trim() : '';
    if (!isUuid(data.id) || !Number.isSafeInteger(data.version) || Number(data.version) < 1 || (decision !== 'approve' && decision !== 'reject') || note.length > 500 || (decision === 'reject' && note.length < 8)) {
      return json({ error: 'Décision invalide ; un refus exige un motif de 8 à 500 caractères.' }, 400);
    }
    const result = await decideAttendanceCorrection(data.id, Number(data.version), decision, note, actor.email);
    if (result === null) return json({ error: 'Demande modifiée, pointage incompatible ou dossier archivé.' }, 409);
    return json({ success: true, attendance: result === false ? null : result });
  } catch (error) { return handleError(error); }
}
