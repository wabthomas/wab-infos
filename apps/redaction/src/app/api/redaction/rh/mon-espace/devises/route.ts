import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { listMyCurrencyPreferences, setMyCurrencyPreference } from '@/lib/redaction/rh/extras-db';
import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    return json({ preferences: await listMyCurrencyPreferences(principal) });
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
    if ((value.currency !== 'CDF' && value.currency !== 'USD') || typeof value.enabled !== 'boolean') {
      return json({ error: 'Requête invalide.' }, 400);
    }
    const ok = await setMyCurrencyPreference(principal, value.currency, value.enabled);
    if (!ok) return json({ error: 'Aucun dossier RH actif lié à ce compte.' }, 403);
    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
