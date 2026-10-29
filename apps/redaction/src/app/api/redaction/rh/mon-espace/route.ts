import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator, listMyAbsences, createAbsence, cancelMyAbsence } from '@/lib/redaction/rh/database';
import { isUuid } from '@/lib/redaction/rh/activities';
import { validateAbsence } from '@/lib/redaction/rh/absences';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    const person = await getMyCollaborator(principal);
    if (!person) return json({ error: 'Aucun dossier RH actif lié à ce compte.' }, 403);
    const absences = await listMyAbsences(principal);
    return json({ person, absences });
  } catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const person = await getMyCollaborator(principal);
    if (!person) return json({ error: 'Aucun dossier RH actif lié à ce compte.' }, 403);
    // L'identifiant du dossier provient exclusivement du lien vérifié côté serveur.
    const input = validateAbsence({ ...(body as Record<string, unknown>), collaboratorId: person.id });
    if (!input) return json({ error: 'Vérifiez les dates et le type d’absence.' }, 400);
    const absence = await createAbsence(input, principal.email, principal);
    if (!absence) return json({ error: 'Dates déjà demandées ou dossier indisponible. Actualisez la page.' }, 409);
    return json({ absence }, 201);
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
    if (!(await cancelMyAbsence(principal, data.id, Number(data.version)))) return json({ error: 'Demande introuvable, modifiée ou non annulable. Actualisez la page.' }, 409);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
