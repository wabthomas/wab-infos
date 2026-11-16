import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { db } from '@/lib/redaction/rh/database';
import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';
import { notifyAnnouncement } from '@/lib/redaction/rh/announcement-notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRhPermission('access_manage');
    const result = await db().query(
      "SELECT id,title,body,url,active,to_char(updated_at AT TIME ZONE 'UTC','YYYYMMDDHH24MISSUS') AS revision FROM redaction_rh.announcements WHERE id='global'"
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
    const active = v.active !== false;
    if (!title || title.length > 160 || !messageBody || messageBody.length > 2000 || url.length > 500
      || (url && (!url.startsWith('/') || url.startsWith('//') || /[\u0000-\u001f\u007f]/.test(url)))) {
      return json({ error: 'Titre et message requis. Le lien doit être une URL interne (160, 2000 et 500 caractères max).' }, 400);
    }
    await db().query(
      `INSERT INTO redaction_rh.announcements (id,title,body,url,active,updated_by,updated_at)
       VALUES ('global',$1,$2,$3,$4,$5,clock_timestamp())
       ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,body=EXCLUDED.body,url=EXCLUDED.url,active=EXCLUDED.active,
         updated_by=EXCLUDED.updated_by,updated_at=GREATEST(clock_timestamp(),redaction_rh.announcements.updated_at+interval '1 microsecond')
       WHERE redaction_rh.announcements.title IS DISTINCT FROM EXCLUDED.title
          OR redaction_rh.announcements.body IS DISTINCT FROM EXCLUDED.body
          OR redaction_rh.announcements.url IS DISTINCT FROM EXCLUDED.url
          OR redaction_rh.announcements.active IS DISTINCT FROM EXCLUDED.active`,
      [title,messageBody,url || null,active,actor.email]
    );
    const saved = await db().query(`SELECT id,title,body,url,active,
      to_char(updated_at AT TIME ZONE 'UTC','YYYYMMDDHH24MISSUS') AS revision
      FROM redaction_rh.announcements WHERE id='global'`);
    const announcement = saved.rows[0] as { id: string; title: string; body: string; url: string | null; active: boolean; revision: string };
    let notifications: { recipients: number; emailSent: number; pushSent: number; failed: number } | null = null;
    let notificationError = false;
    if (announcement.active) {
      try {
        notifications = await notifyAnnouncement({ ...announcement, revision: `global-${announcement.revision}` });
      } catch (error) {
        notificationError = true;
        console.error('[rh] notification annonce non terminée', error instanceof Error ? error.name : 'erreur inconnue');
      }
    }
    return json({ ok: true, notifications, notificationError, revision: `global-${announcement.revision}` });
  } catch (error) {
    return handleError(error);
  }
}
