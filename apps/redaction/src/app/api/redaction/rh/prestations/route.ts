import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { validateActivity, isUuid, isValidMonth, kinshasaToday } from '@/lib/redaction/rh/activities';
import { listActivities, saveActivity } from '@/lib/redaction/rh/database';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireRhPermission('hr_manage');
    const params = new URL(request.url).searchParams;
    const collaboratorId = params.get('collaboratorId');
    const month = params.get('month');
    if (!isUuid(collaboratorId) || !isValidMonth(month)) return json({ error: 'Collaborateur ou mois invalide.' }, 400);
    return json({ activities: await listActivities(collaboratorId, month) });
  } catch (error) { return handleError(error); }
}

async function write(request: Request, update: boolean) {
  try {
    const user = await requireRhPermission('hr_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown;
    try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const data = body as Record<string, unknown>;
    const input = validateActivity(data.activity);
    if (!input || input.date > kinshasaToday() || (update && (!isUuid(data.id) || !Number.isSafeInteger(data.version) || Number(data.version) < 1))) return json({ error: 'Vérifiez les champs de la prestation.' }, 400);
    const result = await saveActivity(input, user.email, update ? data.id as string : undefined, update ? Number(data.version) : undefined);
    if (!result) return json({ error: 'Dossier archivé, journée déjà enregistrée ou données modifiées. Actualisez la liste.' }, 409);
    return json({ activity: result }, update ? 200 : 201);
  } catch (error) { return handleError(error); }
}
export async function POST(request: Request) { return write(request, false); }
export async function PATCH(request: Request) { return write(request, true); }
