import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator, listMyNotifications, markMyNotificationRead } from '@/lib/redaction/rh/database';
import { isUuid } from '@/lib/redaction/rh/activities';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
function enabled() { return process.env.REDACTION_RH_NOTIFICATIONS_ENABLED === 'true'; }
export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    if (!enabled()) return json({ error: 'Notifications désactivées.' }, 503);
    if (!(await getMyCollaborator(principal))) return json({ error: 'Aucun dossier RH actif lié à ce compte.' }, 403);
    return json({ notifications: await listMyNotifications(principal) });
  } catch (error) { return handleError(error); }
}
export async function PATCH(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    if (!enabled()) return json({ error: 'Notifications désactivées.' }, 503);
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const data = body as Record<string, unknown>;
    if (!isUuid(data.id)) return json({ error: 'Notification invalide.' }, 400);
    if (!(await markMyNotificationRead(principal, data.id))) return json({ error: 'Notification indisponible.' }, 404);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
