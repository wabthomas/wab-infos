import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { isUuid } from '@/lib/redaction/rh/activities';
import { downloadDocument } from '@/lib/redaction/rh/database';
import { privateDocumentResponse } from '@/lib/redaction/rh/document-http';
import { json, handleError } from '@/lib/redaction/rh/api';
import { getRhFlags } from '@/lib/redaction/rh/flags';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const principal = await requireRhPrincipal();
    if (!(await getRhFlags()).documentsEnabled) return json({ error: 'Documents RH désactivés.' }, 503);
    const { id } = await params; if (!isUuid(id)) return json({ error: 'Document invalide.' }, 400);
    const document = await downloadDocument(id, principal.email, principal);
    if (!document) return json({ error: 'Document indisponible.' }, 404);
    return privateDocumentResponse(document.bytes, document.fileType);
  } catch (error) { return handleError(error); }
}
