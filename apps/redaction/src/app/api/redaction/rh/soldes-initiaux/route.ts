import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { kinshasaToday } from '@/lib/redaction/rh/activities';
import { validateOpeningBalance } from '@/lib/redaction/rh/opening-balances';
import { createOpeningBalance } from '@/lib/redaction/rh/database';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const user = await requireRhPermission('access_manage');
    if (process.env.REDACTION_RH_FINANCE_ENABLED !== 'true' || process.env.REDACTION_RH_WITHDRAWALS_ENABLED !== 'true') return json({ error: 'Retraits désactivés.' }, 503);
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const input = validateOpeningBalance(body, kinshasaToday().slice(0, 7));
    if (!input) return json({ error: 'Vérifiez la devise, le montant, le mois et la confirmation.' }, 400);
    if (!(await createOpeningBalance(input, user.email))) return json({ error: 'Initialisation impossible : dossier non lié, propre dossier, solde déjà établi ou retrait existant.' }, 409);
    return json({ ok: true }, 201);
  } catch (error) { return handleError(error); }
}
