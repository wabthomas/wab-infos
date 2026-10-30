import { requireRedactionSuperAdmin } from '@/lib/redaction/strapi-editor';
import { isUuid } from '@/lib/redaction/rh/activities';
import { isRhRole } from '@/lib/redaction/rh/permissions';
import { listRhGrants, changeRhGrant } from '@/lib/redaction/rh/database';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { await requireRedactionSuperAdmin(); return json({ grants: await listRhGrants(), enabled: (await getRhFlags()).rolesEnabled }); }
  catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireRedactionSuperAdmin();
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const v = body as Record<string, unknown>;
    if (!isUuid(v.collaboratorId) || !isRhRole(v.role) || (v.action !== 'grant' && v.action !== 'revoke')) return json({ error: 'Droit invalide.' }, 400);
    if (!(await changeRhGrant(v.collaboratorId, v.role, v.action === 'grant', user.email))) return json({ error: 'Dossier inactif ou sans compte lié, ou droit déjà dans cet état.' }, 409);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
