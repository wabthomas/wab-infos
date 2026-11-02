import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getRedactionJwt } from '@/lib/redaction/strapi-editor';
import { getStrapiUrl } from '@/lib/redaction/config';
import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await requireRhPrincipal();
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    const jwt = await getRedactionJwt();
    if (!jwt) return json({ error: 'Session expirée.' }, 401);
    let body: unknown;
    try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const v = body as Record<string, unknown>;
    const current = typeof v.currentPassword === 'string' ? v.currentPassword : '';
    const next = typeof v.newPassword === 'string' ? v.newPassword : '';
    const confirm = typeof v.confirmPassword === 'string' ? v.confirmPassword : '';
    if (next.length < 8 || next.length > 128 || next !== confirm) return json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères et être identique à la confirmation.' }, 400);
    const response = await fetch(`${getStrapiUrl()}/api/auth/changePassword`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ currentPassword: current, password: next, passwordConfirmation: confirm }),
      cache: 'no-store',
    });
    if (!response.ok) {
      let detail = '';
      try { const data = await response.json(); detail = data?.error?.message ?? ''; } catch { /* ignore */ }
      return json({ error: detail || 'Mot de passe actuel incorrect.' }, 400);
    }
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}