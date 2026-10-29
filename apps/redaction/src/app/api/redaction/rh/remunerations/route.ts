import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { isUuid } from '@/lib/redaction/rh/activities';
import { validateRemuneration } from '@/lib/redaction/rh/remunerations';
import { listRemunerations, createRemuneration, decideRemuneration } from '@/lib/redaction/rh/database';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
function enabled() { return process.env.REDACTION_RH_FINANCE_ENABLED === 'true'; }
export async function GET(request: Request) {
  try {
    await requireRhPermission('finance_manage');
    if (!enabled()) return json({ error: 'Suivi des rémunérations désactivé.' }, 503);
    const id = new URL(request.url).searchParams.get('collaboratorId');
    if (!isUuid(id)) return json({ error: 'Collaborateur invalide.' }, 400);
    return json({ remunerations: await listRemunerations(id) });
  } catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireRhPermission('finance_manage');
    if (!enabled()) return json({ error: 'Suivi des rémunérations désactivé.' }, 503);
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const input = validateRemuneration(body);
    if (!input) return json({ error: 'Vérifiez le collaborateur, le mois, la devise et le montant.' }, 400);
    const remuneration = await createRemuneration(input, user.email);
    if (!remuneration) return json({ error: 'Dossier indisponible ou rémunération existante pour ce mois et cette devise.' }, 409);
    return json({ remuneration }, 201);
  } catch (error) { return handleError(error); }
}
export async function PATCH(request: Request) {
  try {
    const user = await requireRhPermission('finance_manage');
    if (!enabled()) return json({ error: 'Suivi des rémunérations désactivé.' }, 503);
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const data = body as Record<string, unknown>;
    if (!isUuid(data.id) || !Number.isSafeInteger(data.version) || Number(data.version) < 1 || (data.action !== 'validate' && data.action !== 'cancel')) return json({ error: 'Action invalide.' }, 400);
    if (!(await decideRemuneration(data.id, Number(data.version), data.action, user.email))) return json({ error: 'Rémunération modifiée, déjà traitée ou dossier archivé. Actualisez la liste.' }, 409);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
