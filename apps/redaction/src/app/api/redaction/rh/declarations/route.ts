import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { isUuid } from '@/lib/redaction/rh/activities';
import { validateSubmissionDecision } from '@/lib/redaction/rh/submissions';
import { listSubmissions, decideSubmission } from '@/lib/redaction/rh/database';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    await requireRhPermission('hr_manage');
    const collaboratorId = new URL(request.url).searchParams.get('collaboratorId');
    if (!isUuid(collaboratorId)) return json({ error: 'Collaborateur invalide.' }, 400);
    return json({ submissions: await listSubmissions(collaboratorId) });
  } catch (error) { return handleError(error); }
}
export async function PATCH(request: Request) {
  try {
    const user = await requireRhPermission('hr_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const data = body as Record<string, unknown>;
    const decision = validateSubmissionDecision(data);
    if (!decision || !isUuid(data.id) || !Number.isSafeInteger(data.version) || Number(data.version) < 1) return json({ error: 'Décision invalide.' }, 400);
    if (!(await decideSubmission(data.id, Number(data.version), decision.decision, decision.note, user.email))) return json({ error: 'Dossier archivé, déclaration modifiée ou relevé déjà existant. Actualisez et vérifiez la journée.' }, 409);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
