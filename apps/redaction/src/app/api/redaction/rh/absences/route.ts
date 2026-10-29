import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { isUuid, isValidMonth } from '@/lib/redaction/rh/activities';
import { validateAbsence, validateDecision } from '@/lib/redaction/rh/absences';
import { createAbsence, decideAbsence, listAbsences } from '@/lib/redaction/rh/database';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    await requireRhPermission('hr_manage');
    const collaboratorId = new URL(request.url).searchParams.get('collaboratorId');
    const month = new URL(request.url).searchParams.get('month');
    if (!isUuid(collaboratorId) || (month !== null && !isValidMonth(month))) return json({ error: 'Collaborateur invalide.' }, 400);
    return json({ absences: await listAbsences(collaboratorId, month ?? undefined) });
  } catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireRhPermission('hr_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const input = validateAbsence(body);
    if (!input) return json({ error: 'Vérifiez les dates et le type d’absence.' }, 400);
    const absence = await createAbsence(input, user.email);
    if (!absence) return json({ error: 'Dossier archivé ou dates chevauchant une demande en attente ou approuvée.' }, 409);
    return json({ absence }, 201);
  } catch (error) { return handleError(error); }
}
export async function PATCH(request: Request) {
  try {
    const user = await requireRhPermission('hr_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const data = body as Record<string, unknown>;
    const decision = validateDecision(data);
    if (!decision || !isUuid(data.id) || !Number.isSafeInteger(data.version) || Number(data.version) < 1) return json({ error: 'Décision invalide.' }, 400);
    const absence = await decideAbsence(data.id, Number(data.version), decision.decision, decision.note, user.email);
    if (!absence) return json({ error: 'Demande modifiée, décision impossible ou dossier archivé. Actualisez la liste.' }, 409);
    return json({ absence });
  } catch (error) { return handleError(error); }
}
