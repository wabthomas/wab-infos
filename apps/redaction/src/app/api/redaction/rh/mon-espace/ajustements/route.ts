import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator, listMyAdjustments } from '@/lib/redaction/rh/database';
import { json, handleError } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    if (process.env.REDACTION_RH_FINANCE_ENABLED !== 'true' || process.env.REDACTION_RH_WITHDRAWALS_ENABLED !== 'true') return json({ error: 'Ajustements désactivés.' }, 503);
    if (!(await getMyCollaborator(principal))) return json({ error: 'Aucun dossier RH actif lié à ce compte.' }, 403);
    return json({ adjustments: await listMyAdjustments(principal) });
  } catch (error) { return handleError(error); }
}
