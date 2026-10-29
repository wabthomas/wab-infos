import { requireRedactionSuperAdmin } from '@/lib/redaction/strapi-editor';
import { getAccountLink, changeAccountLink } from '@/lib/redaction/rh/database';
import { lookupRhAccount } from '@/lib/redaction/rh/identity';
import { isUuid } from '@/lib/redaction/rh/activities';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';

function accountId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d{0,9}$/.test(value)) return null;
  const n = Number(value);
  return n <= 2147483647 ? n : null;
}
export async function GET(request: Request) {
  try {
    await requireRedactionSuperAdmin();
    const p = new URL(request.url).searchParams;
    const collaboratorId = p.get('collaboratorId');
    if (collaboratorId !== null) {
      if (!isUuid(collaboratorId)) return json({ error: 'Dossier invalide.' }, 400);
      return json({ link: await getAccountLink(collaboratorId) });
    }
    const id = accountId(p.get('accountId'));
    if (!id) return json({ error: 'Identifiant de compte invalide.' }, 400);
    const account = await lookupRhAccount(id);
    return account ? json({ account }) : json({ error: 'Compte introuvable, non confirmé ou bloqué.' }, 404);
  } catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireRedactionSuperAdmin();
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const data = body as Record<string, unknown>;
    if (!isUuid(data.collaboratorId) || !Number.isSafeInteger(data.version) || Number(data.version) < 1) return json({ error: 'Dossier ou version invalide.' }, 400);
    let account = null;
    if (data.action === 'link') {
      const id = accountId(data.accountId);
      if (!id || typeof data.expectedEmail !== 'string') return json({ error: 'Compte invalide.' }, 400);
      account = await lookupRhAccount(id);
      if (!account || account.email !== data.expectedEmail) return json({ error: 'Compte modifié ou indisponible. Vérifiez à nouveau son identité.' }, 409);
    } else if (data.action !== 'unlink') return json({ error: 'Action invalide.' }, 400);
    const result = await changeAccountLink(data.collaboratorId, Number(data.version), account, user.email);
    if (result === 'conflict') return json({ error: 'Liaison impossible : compte déjà lié, dossier modifié ou archivé. Actualisez la liste.' }, 409);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
