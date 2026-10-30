import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { adminWithdrawalView, decideWithdrawal } from '@/lib/redaction/rh/database';
import { isUuid, kinshasaToday } from '@/lib/redaction/rh/activities';
import { validateWithdrawalDecision } from '@/lib/redaction/rh/withdrawals';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
import { getRhFlags } from '@/lib/redaction/rh/flags';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
await requireRhPermission('finance_read');
    if (!(await getRhFlags()).withdrawalsEnabled) return json({ error: 'Retraits désactivés.' }, 503);
    const id = new URL(request.url).searchParams.get('collaboratorId');
    if (!isUuid(id)) return json({ error: 'Collaborateur invalide.' }, 400);
    return json(await adminWithdrawalView(id));
  } catch (error) { return handleError(error); }
}
export async function PATCH(request: Request) {
  try {
    const user = await requireRhPermission('finance_manage');
    if (!(await getRhFlags()).withdrawalsEnabled) return json({ error: 'Retraits désactivés.' }, 503);
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const data = body as Record<string, unknown>;
    const decision = validateWithdrawalDecision(data, kinshasaToday());
    if (!decision || !isUuid(data.id) || !Number.isSafeInteger(data.version) || Number(data.version) < 1) return json({ error: 'Vérifiez la décision et les champs.' }, 400);
    if (!(await decideWithdrawal(data.id, Number(data.version), decision, user.email))) return json({ error: 'Décision impossible : demande modifiée, référence déjà utilisée, accès retiré ou propre retrait.' }, 409);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
