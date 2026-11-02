import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator } from '@/lib/redaction/rh/database';
import { listMyHistoricalPayments, declareHistoricalPayment, cancelMyHistoricalPayment } from '@/lib/redaction/rh/historical-payments-db';
import { validateHistoricalPayment } from '@/lib/redaction/rh/historical-payments';
import { kinshasaToday, isUuid } from '@/lib/redaction/rh/activities';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    if (!(await getMyCollaborator(principal))) return json({ error: 'Dossier RH indisponible.' }, 403);
    const pageRaw = new URL(request.url).searchParams.get('page') ?? '1';
    if (!/^[1-9]\d{0,3}$/.test(pageRaw)) return json({ error: 'Page invalide.' }, 400);
    return json(await listMyHistoricalPayments(principal, Number(pageRaw)));
  } catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const input = validateHistoricalPayment(body, kinshasaToday(), null);
    if (!input) return json({ error: 'Vérifiez date, montant, devise et informations de paiement.' }, 400);
    const payment = await declareHistoricalPayment(principal, input);
    if (!payment) return json({ error: 'Dossier indisponible, date avant votre arrivée ou clé déjà utilisée avec d’autres données.' }, 409);
    return json({ payment }, 201);
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
    if (!(await cancelMyHistoricalPayment(principal, data.id, Number(data.version)))) return json({ error: 'Déclaration déjà traitée ou modifiée.' }, 409);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
