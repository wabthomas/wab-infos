import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { db } from '@/lib/redaction/rh/database';
import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRhPermission('access_manage');
    const result = await db().query(
      "SELECT id, title, body, url, active FROM redaction_rh.announcements WHERE id='global'"
    );
    return json({ message: result.rows[0] ?? null });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const actor = await requireRhPermission('access_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown;
    try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const v = body as Record<string, unknown>;
    const title = typeof v.title === 'string' ? v.title.trim() : '';
    const messageBody = typeof v.body === 'string' ? v.body.trim() : '';
    const url = typeof v.url === 'string' ? v.url.trim() : '';
    if (!title || title.length > 160 || !messageBody || messageBody.length > 2000 || url.length > 500) {
      return json({ error: 'Titre et message requis (160 et 2000 caractères max).' }, 400);
    }
    await db().query(
      `INSERT INTO redaction_rh.announcements (id, title, body, url, active, updated_by, updated_at)
       VALUES ('global',$1,$2,$3,$4,$5,now())
       ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, body=EXCLUDED.body, url=EXCLUDED.url, active=EXCLUDED.active, updated_by=EXCLUDED.updated_by, updated_at=now()`,
      [title, messageBody, url || null, v.active !== false, actor.email]
    );
    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
