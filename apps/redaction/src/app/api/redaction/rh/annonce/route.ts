import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { db } from '@/lib/redaction/rh/database';
import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    const result = await db().query(
      `SELECT 'global-'||to_char(updated_at AT TIME ZONE 'UTC','YYYYMMDDHH24MISSUS') AS id,title,body,url
       FROM redaction_rh.announcements WHERE active ORDER BY updated_at DESC LIMIT 1`
    );
    if (!result.rowCount) return json({ message: null, acknowledged: true });
    const message = result.rows[0];
    const ack = await db().query(
      'SELECT 1 FROM redaction_rh.release_acknowledgements WHERE account_id=$1 AND release_id=$2',
      [principal.id, message.id]
    );
    return json({ message, acknowledged: Boolean(ack.rowCount) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown;
    try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const id = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>).id : null;
    if (typeof id !== 'string' || id.length > 40 || (id !== 'global' && !/^global-\d{20}$/.test(id))) return json({ error: 'Identifiant invalide.' }, 400);
    const current = await db().query(`SELECT 'global-'||to_char(updated_at AT TIME ZONE 'UTC','YYYYMMDDHH24MISSUS') AS id
      FROM redaction_rh.announcements WHERE id='global' AND active`);
    if (!current.rowCount) return json({ error: 'Annonce introuvable.' }, 404);
    if (id !== 'global' && id !== current.rows[0].id) return json({ error: 'Cette annonce a été remplacée.' }, 409);
    await db().query(
      'INSERT INTO redaction_rh.release_acknowledgements (account_id, release_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [principal.id, current.rows[0].id]
    );
    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
