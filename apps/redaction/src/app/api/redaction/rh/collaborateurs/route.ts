import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { validateCollaborator } from '@/lib/redaction/rh/collaborator';
import { archiveCollaborator, listCollaborators, saveCollaborator } from '@/lib/redaction/rh/database';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRhPermission('team_read');
    return json({ collaborators: await listCollaborators() });
  } catch (error) { return handleError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireRhPermission('hr_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown;
    try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const input = validateCollaborator(body);
    if (!input) return json({ error: 'Vérifiez les champs du collaborateur.' }, 400);
    return json({ collaborator: await saveCollaborator(input, user.email) }, 201);
  } catch (error) { return handleError(error); }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireRhPermission('hr_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown;
    try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const data = body as Record<string, unknown>;
    if (typeof data.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id) || !Number.isSafeInteger(data.version) || Number(data.version) < 1) return json({ error: 'Identifiant ou version invalide.' }, 400);
    let result;
    if (data.action === 'archive') result = await archiveCollaborator(data.id, Number(data.version), user.email);
    else if (data.action === 'update') {
      const input = validateCollaborator(data.collaborator);
      if (!input) return json({ error: 'Vérifiez les champs du collaborateur.' }, 400);
      result = await saveCollaborator(input, user.email, data.id, Number(data.version));
    } else return json({ error: 'Action invalide.' }, 400);
    if (!result) return json({ error: 'Dossier modifié ou archivé entre-temps. Actualisez la liste.' }, 409);
    return json({ collaborator: result });
  } catch (error) { return handleError(error); }
}
