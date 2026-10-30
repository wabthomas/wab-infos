import { requireRedactionUser } from '@/lib/redaction/strapi-editor';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';
import { managementEventTypes } from '@/lib/redaction/rh/management-notifications';
import { listManagementEvents, markManagementEventRead } from '@/lib/redaction/rh/database';
import { isUuid } from '@/lib/redaction/rh/activities';
import { json, handleError, validOrigin, readBody } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
async function context() {
  const user = await requireRedactionUser();
  const capabilities = await getRhCapabilities();
  return { user, types: managementEventTypes(capabilities, process.env.REDACTION_RH_FINANCE_ENABLED === 'true' && process.env.REDACTION_RH_WITHDRAWALS_ENABLED === 'true', process.env.REDACTION_RH_DISPUTES_ENABLED === 'true') };
}
export async function GET() {
  try {
    const { user,types } = await context();
    if (process.env.REDACTION_RH_MANAGEMENT_NOTIFICATIONS_ENABLED !== 'true') return json({error:'Notifications désactivées.'},503);
    if (!types.length) return json({error:'Accès RH non autorisé.'},403);
    return json({ notifications: await listManagementEvents(user,types) });
  } catch (error) { return handleError(error); }
}
export async function PATCH(request: Request) {
  try {
    const { user,types } = await context();
    if (process.env.REDACTION_RH_MANAGEMENT_NOTIFICATIONS_ENABLED !== 'true') return json({error:'Notifications désactivées.'},503);
    if (!types.length) return json({error:'Accès RH non autorisé.'},403);
    if (!validOrigin(request)) return json({error:'Origine non autorisée.'},403);
    let body: unknown; try { body=await readBody(request); } catch { return json({error:'Requête invalide.'},400); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || !isUuid((body as Record<string,unknown>).id)) return json({error:'Notification invalide.'},400);
    if (!await markManagementEventRead(user,(body as {id:string}).id,types)) return json({error:'Notification indisponible.'},404);
    return json({ok:true});
  } catch (error) { return handleError(error); }
}
