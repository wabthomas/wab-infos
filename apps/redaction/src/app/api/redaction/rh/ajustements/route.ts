import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { isUuid } from '@/lib/redaction/rh/activities';
import { validateAdjustment } from '@/lib/redaction/rh/adjustments';
import { listAdjustments, createAdjustment, decideAdjustment } from '@/lib/redaction/rh/database';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
function enabled() { return process.env.REDACTION_RH_FINANCE_ENABLED === 'true' && process.env.REDACTION_RH_WITHDRAWALS_ENABLED === 'true'; }
export async function GET(request: Request) {
  try {
    await requireRhPermission('finance_manage');
    if (!enabled()) return json({ error: 'Ajustements désactivés.' }, 503);
    const person = new URL(request.url).searchParams.get('collaboratorId');
    if (!isUuid(person)) return json({ error: 'Collaborateur invalide.' }, 400);
    return json({ adjustments: await listAdjustments(person) });
  } catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireRhPermission('finance_manage');
    if (!enabled()) return json({ error: 'Ajustements désactivés.' }, 503);
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const input = validateAdjustment(body);
    if (!input) return json({ error: 'Vérifiez la devise, le montant et le motif.' }, 400);
    if (!(await createAdjustment(input, user.email))) return json({ error: 'Dossier inactif ou solde initial non établi.' }, 409);
    return json({ ok: true }, 201);
  } catch (error) { return handleError(error); }
}
export async function PATCH(request: Request) {
  try {
    const user = await requireRhPermission('finance_manage');
    if (!enabled()) return json({ error: 'Ajustements désactivés.' }, 503);
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const v = body as Record<string, unknown>;
    if (!isUuid(v.id) || !Number.isSafeInteger(v.version) || Number(v.version) < 1 || (v.action !== 'validate' && v.action !== 'cancel')) return json({ error: 'Requête invalide.' }, 400);
    if (!(await decideAdjustment(v.id, Number(v.version), v.action, user.email))) return json({ error: 'Ajustement impossible : dossier ou compte indisponible, propre dossier, montant insuffisant ou opération déjà traitée.' }, 409);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
