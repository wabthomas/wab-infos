import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { isUuid } from '@/lib/redaction/rh/activities';
import { documentFileType, isDocumentCategory, validateDocumentTitle } from '@/lib/redaction/rh/documents';
import { readDocumentForm } from '@/lib/redaction/rh/document-http';
import { listDocuments, createDocument, archiveDocument } from '@/lib/redaction/rh/database';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
function enabled() { return process.env.REDACTION_RH_DOCUMENTS_ENABLED === 'true'; }
export async function GET(request: Request) {
  try {
    await requireRhPermission('access_manage');
    if (!enabled()) return json({ error: 'Documents RH désactivés.' }, 503);
    const person = new URL(request.url).searchParams.get('collaboratorId');
    if (!isUuid(person)) return json({ error: 'Collaborateur invalide.' }, 400);
    return json({ documents: await listDocuments(person) });
  } catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireRhPermission('access_manage');
    if (!enabled()) return json({ error: 'Documents RH désactivés.' }, 503);
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let form: FormData; try { form = await readDocumentForm(request); } catch { return json({ error: 'Fichier invalide ou trop volumineux.' }, 400); }
    const collaboratorId = form.get('collaboratorId'); const title = validateDocumentTitle(form.get('title'));
    const category = form.get('category'); const share = form.get('share'); const file = form.get('file');
    if (!isUuid(collaboratorId) || !title || !isDocumentCategory(category) || (share !== 'yes' && share !== 'no') || !(file instanceof File)) return json({ error: 'Vérifiez les champs du document.' }, 400);
    const bytes = Buffer.from(await file.arrayBuffer()); const fileType = documentFileType(bytes);
    if (!fileType) return json({ error: 'Le fichier doit être un PDF, JPEG ou PNG de 5 Mo maximum.' }, 400);
    const document = await createDocument({ collaboratorId, title, category, fileType, bytes, share: share === 'yes' }, user.email);
    if (!document) return json({ error: 'Dossier inactif ou compte non lié pour le partage.' }, 409);
    return json({ document }, 201);
  } catch (error) { return handleError(error); }
}
export async function PATCH(request: Request) {
  try {
    const user = await requireRhPermission('access_manage');
    if (!enabled()) return json({ error: 'Documents RH désactivés.' }, 503);
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const v = body as Record<string, unknown>;
    if (!isUuid(v.id) || !Number.isSafeInteger(v.version) || Number(v.version) < 1 || v.action !== 'archive') return json({ error: 'Requête invalide.' }, 400);
    if (!(await archiveDocument(v.id, Number(v.version), user.email))) return json({ error: 'Document indisponible ou modifié.' }, 409);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
