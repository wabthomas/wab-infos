import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator, listMyAdjustments } from '@/lib/redaction/rh/database';
import { json, handleError } from '@/lib/redaction/rh/api';
import { getRhFlags } from '@/lib/redaction/rh/flags';
export const dynamic = 'force-dynamic';
async function enabled(){const flags=await getRhFlags();return flags.financeEnabled&&flags.withdrawalsEnabled;}
export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    if (!(await enabled())) return json({ error: 'Ajustements désactivés.' }, 503);
    if (!(await getMyCollaborator(principal))) return json({ error: 'Aucun dossier RH actif lié à ce compte.' }, 403);
    return json({ adjustments: await listMyAdjustments(principal) });
  } catch (error) { return handleError(error); }
}
