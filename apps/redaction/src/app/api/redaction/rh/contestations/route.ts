import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { isUuid } from '@/lib/redaction/rh/activities';
import { disputeText } from '@/lib/redaction/rh/disputes';
import { listDisputes, listOpenDisputes, answerDispute } from '@/lib/redaction/rh/database';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    await requireRhPermission('access_manage');
    if (process.env.REDACTION_RH_DISPUTES_ENABLED !== 'true') return json({ error: 'Contestations désactivées.' },503);
    const params = new URL(request.url).searchParams;
    if (params.get('status') === 'open' && !params.has('collaboratorId')) return json({ disputes: await listOpenDisputes() });
    const id = params.get('collaboratorId');
    if (!isUuid(id)) return json({ error: 'Collaborateur invalide.' },400);
    return json({ disputes: await listDisputes(id) });
  } catch (error) { return handleError(error); }
}
export async function PATCH(request: Request) {
  try {
    const user = await requireRhPermission('access_manage');
    if (process.env.REDACTION_RH_DISPUTES_ENABLED !== 'true') return json({ error: 'Contestations désactivées.' },503);
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' },403);
    let body: unknown; try { body = await readBody(request); } catch { return json({error:'Requête invalide.'},400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({error:'Requête invalide.'},400);
    const v = body as Record<string,unknown>; const response = disputeText(v.response);
    if (!isUuid(v.id) || !Number.isSafeInteger(v.version) || Number(v.version) < 1 || !response) return json({error:'Vérifiez la réponse et la version.'},400);
    if (!await answerDispute(v.id,Number(v.version),response,user.email)) return json({error:'Contestation indisponible, déjà traitée ou propre dossier.'},409);
    return json({ok:true});
  } catch (error) { return handleError(error); }
}
