import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { myWithdrawalView, createMyWithdrawal, cancelMyWithdrawal } from '@/lib/redaction/rh/database';
import { isUuid } from '@/lib/redaction/rh/activities';
import { validateWithdrawal } from '@/lib/redaction/rh/withdrawals';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
function enabled() { return process.env.REDACTION_RH_FINANCE_ENABLED === 'true' && process.env.REDACTION_RH_WITHDRAWALS_ENABLED === 'true'; }
export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    if (!enabled()) return json({ error: 'Retraits désactivés.' }, 503);
    const result = await myWithdrawalView(principal);
    if (!result) return json({ error: 'Aucun dossier RH actif lié à ce compte.' }, 403);
    return json(result);
  } catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    if (!enabled()) return json({ error: 'Retraits désactivés.' }, 503);
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const input = validateWithdrawal(body);
    if (!input) return json({ error: 'Vérifiez le montant, la devise et le moyen de paiement.' }, 400);
    const withdrawal = await createMyWithdrawal(principal, input);
    if (!withdrawal) return json({ error: 'Solde insuffisant, demande déjà utilisée ou dossier indisponible. Actualisez.' }, 409);
    return json({ withdrawal }, 201);
  } catch (error) { return handleError(error); }
}
export async function PATCH(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    if (!enabled()) return json({ error: 'Retraits désactivés.' }, 503);
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const data = body as Record<string, unknown>;
    if (data.action !== 'cancel' || !isUuid(data.id) || !Number.isSafeInteger(data.version) || Number(data.version) < 1) return json({ error: 'Requête invalide.' }, 400);
    if (!(await cancelMyWithdrawal(principal, data.id, Number(data.version)))) return json({ error: 'Demande introuvable ou déjà traitée.' }, 409);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
