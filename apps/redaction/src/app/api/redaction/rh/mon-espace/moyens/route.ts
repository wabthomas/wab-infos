import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { createMyPayoutMethod, listMyPayoutMethods, setMyPayoutMethodActive } from '@/lib/redaction/rh/extras-db';
import { isPayoutId, validatePayoutMethod } from '@/lib/redaction/rh/payouts';
import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    return json({ methods: await listMyPayoutMethods(principal) });
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
    const input = validatePayoutMethod(body);
    if (!input) return json({ error: 'Vérifiez le type, l’opérateur et le numéro.' }, 400);
    const method = await createMyPayoutMethod(principal, input);
    if (!method) return json({ error: 'Aucun dossier RH actif lié à ce compte.' }, 403);
    return json({ method });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
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
    const value = body as Record<string, unknown>;
    if (!isPayoutId(value.id) || typeof value.active !== 'boolean' || !Number.isInteger(value.version)) {
      return json({ error: 'Requête invalide.' }, 400);
    }
    const ok = await setMyPayoutMethodActive(principal, value.id, value.active, value.version as number);
    if (!ok) return json({ error: 'Moyen introuvable ou modifié entre-temps.' }, 409);
    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
