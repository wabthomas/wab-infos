import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { createMyAttendanceCorrection, listMyAttendanceCorrections } from '@/lib/redaction/rh/attendance-corrections-db';
import { kinshasaToday } from '@/lib/redaction/rh/activities';
import { validateAttendanceCorrection } from '@/lib/redaction/rh/attendance';
import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    return json({ corrections: await listMyAttendanceCorrections(principal) });
  } catch (error) { return handleError(error); }
}

export async function POST(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown;
    try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const input = validateAttendanceCorrection(body, kinshasaToday());
    if (!input) return json({ error: 'Vérifiez la date, les heures et le motif (8 à 500 caractères). Les demandes sont limitées aux cinq dernières années.' }, 400);
    const correction = await createMyAttendanceCorrection(principal, input);
    if (!correction) return json({ error: 'Compte RH non lié ou demande déjà en attente pour cette journée.' }, 409);
    return json({ correction }, 201);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') return json({ error: 'Une demande de correction est déjà en attente pour cette journée.' }, 409);
    return handleError(error);
  }
}
