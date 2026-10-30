import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { listMyAttendance, signMyAttendance } from '@/lib/redaction/rh/extras-db';
import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    return json({ attendance: await listMyAttendance(principal) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown;
    try {
      body = await readBody(request);
    } catch {
      return json({ error: 'Requête invalide.' }, 400);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const action = (body as Record<string, unknown>).action;
    if (action !== 'in' && action !== 'out') return json({ error: 'Action invalide.' }, 400);
    const row = await signMyAttendance(principal, action);
    if (!row) return json({ error: 'Pointage impossible (déjà signé ou dossier introuvable).' }, 409);
    return json({ attendance: row });
  } catch (error) {
    return handleError(error);
  }
}
