import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator, listMySubmissions, createMySubmission, cancelMySubmission } from '@/lib/redaction/rh/database';
import { isUuid, kinshasaToday } from '@/lib/redaction/rh/activities';
import { validateSubmission } from '@/lib/redaction/rh/submissions';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    if (!(await getMyCollaborator(principal))) return json({ error: 'Aucun dossier RH actif lié à ce compte.' }, 403);
    return json({ submissions: await listMySubmissions(principal) });
  } catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const input = validateSubmission(body, kinshasaToday());
    if (!input) return json({ error: 'Vérifiez la date et la description.' }, 400);
    const submission = await createMySubmission(principal, input);
    if (!submission) return json({ error: 'Dossier indisponible ou relevé déjà enregistré ou en attente pour cette date.' }, 409);
    return json({ submission }, 201);
  } catch (error) { return handleError(error); }
}
export async function PATCH(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const data = body as Record<string, unknown>;
    if (data.action !== 'cancel' || !isUuid(data.id) || !Number.isSafeInteger(data.version) || Number(data.version) < 1) return json({ error: 'Requête invalide.' }, 400);
    if (!(await cancelMySubmission(principal, data.id, Number(data.version)))) return json({ error: 'Déclaration introuvable, modifiée ou non annulable. Actualisez la page.' }, 409);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
