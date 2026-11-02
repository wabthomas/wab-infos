import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { listHistoricalPaymentsForReview, reviewHistoricalPayment, declareHistoricalPaymentForPerson } from '@/lib/redaction/rh/historical-payments-db';
import { isUuid, kinshasaToday } from '@/lib/redaction/rh/activities';
import { validateHistoricalPayment, validateHistoricalReview } from '@/lib/redaction/rh/historical-payments';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireRhPermission('finance_read');
    const status = new URL(request.url).searchParams.get('status') ?? 'pending';
    if (status !== 'pending' && status !== 'all') return json({ error: 'Filtre invalide.' }, 400);
    return json({ payments: await listHistoricalPaymentsForReview(status) });
  } catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try {
    const actor = await requireRhPermission('finance_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const collaboratorId = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>).collaboratorId : null;
    const input = validateHistoricalPayment(body,kinshasaToday(),null);
    if (!isUuid(collaboratorId) || !input || !input.note) return json({ error: 'Collaborateur, données et note de provenance requis.' }, 400);
    const payment = await declareHistoricalPaymentForPerson(actor,collaboratorId,input);
    if (!payment) return json({ error: 'Dossier/date d’arrivée invalide ou clé déjà utilisée.' }, 409);
    return json({ payment },201);
  } catch (error) { return handleError(error); }
}
export async function PATCH(request: Request) {
  try {
    const actor = await requireRhPermission('finance_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const input = validateHistoricalReview(body);
    if (!input) return json({ error: 'Décision, source ou motif invalide.' }, 400);
    const result = await reviewHistoricalPayment(actor.email,input);
    if (result === 'self') return json({ error: 'Un second responsable doit traiter sa propre déclaration.' }, 403);
    if (result === 'match') return json({ error: 'Paiement existant : associez son identifiant ou confirmez explicitement un paiement distinct.' }, 409);
    if (result !== 'ok') return json({ error: 'Déclaration déjà traitée ou modifiée.' }, 409);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
