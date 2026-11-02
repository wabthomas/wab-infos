import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator, listMyPayments } from '@/lib/redaction/rh/database';
import { parseHistoryQuery } from '@/lib/redaction/rh/personal-history';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { json, handleError } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    const flags = await getRhFlags();
    if (!flags.financeEnabled || !flags.withdrawalsEnabled) return json({ error: 'Retraits désactivés.' }, 503);
    const query = parseHistoryQuery(request.url);
    if (!query) return json({ error: 'Filtre historique invalide.' }, 400);
    if (!(await getMyCollaborator(principal))) return json({ error: 'Aucun dossier RH actif lié à ce compte.' }, 403);
    return json(await listMyPayments(principal, query));
  } catch (error) { return handleError(error); }
}
