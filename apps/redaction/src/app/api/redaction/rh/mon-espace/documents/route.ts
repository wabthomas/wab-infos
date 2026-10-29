import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator, listMyDocuments } from '@/lib/redaction/rh/database';
import { json, handleError } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    if (process.env.REDACTION_RH_DOCUMENTS_ENABLED !== 'true') return json({ error: 'Documents RH désactivés.' }, 503);
    if (!(await getMyCollaborator(principal))) return json({ error: 'Aucun dossier RH actif lié à ce compte.' }, 403);
    return json({ documents: await listMyDocuments(principal) });
  } catch (error) { return handleError(error); }
}
