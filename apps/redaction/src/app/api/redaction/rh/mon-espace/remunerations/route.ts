import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator, listMyRemunerations } from '@/lib/redaction/rh/database';
import { json, handleError } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    if (process.env.REDACTION_RH_FINANCE_ENABLED !== 'true') return json({ error: 'Suivi des rémunérations désactivé.' }, 503);
    if (!(await getMyCollaborator(principal))) return json({ error: 'Aucun dossier RH actif lié à ce compte.' }, 403);
    return json({ remunerations: await listMyRemunerations(principal) });
  } catch (error) { return handleError(error); }
}
