import { timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/redaction/rh/database';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { handleError, json } from '@/lib/redaction/rh/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Appel quotidien après l’heure habituelle de sortie (Kinshasa). Idempotent par personne, date et rappel. */
export async function GET(request: Request) {
  const secret = process.env.REDACTION_RH_REMINDERS_CRON_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  if (!secret || secret.length < 32) return json({ error: 'Rappels non configurés.' }, 503);
  const expected = Buffer.from(secret); const received = Buffer.from(supplied);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return json({ error: 'Non autorisé.' }, 401);
  try {
    const flags = await getRhFlags();
    if (!flags.rhEnabled || !flags.notificationsEnabled) return json({ skipped: true, reason: 'notifications_disabled' });
    const dateRows = await db().query(`SELECT to_char(now() AT TIME ZONE 'Africa/Kinshasa','YYYY-MM-DD') AS day,
      to_char(now() AT TIME ZONE 'Africa/Kinshasa','HH24:MI') AS time,
      COALESCE((SELECT setting_value FROM redaction_rh.organization_settings WHERE setting_key='attendanceEndTime'),'18:00') AS end_time`);
    const { day, time, end_time: endTime } = dateRows.rows[0];
    if (time < endTime) return json({ skipped: true, reason: 'before_attendance_end', endTime });

    const candidates = await db().query(`SELECT a.collaborator_id AS "collaboratorId",l.account_email AS email,
      CASE WHEN a.check_out IS NULL THEN true ELSE false END AS "missingExit",
      NOT EXISTS (SELECT 1 FROM redaction_rh.activity_submissions s
        WHERE s.collaborator_id=a.collaborator_id AND s.activity_date=a.work_date) AS "missingActivity"
      FROM redaction_rh.attendance a
      JOIN redaction_rh.collaborators c ON c.id=a.collaborator_id AND NOT c.archived
      JOIN redaction_rh.account_links l ON l.collaborator_id=a.collaborator_id
      WHERE a.work_date=$1::date AND a.check_in IS NOT NULL AND l.account_email IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM redaction_rh.absence_requests r WHERE r.collaborator_id=a.collaborator_id
        AND r.status='approved' AND r.start_date<=a.work_date AND r.end_date>=a.work_date)
      ORDER BY a.collaborator_id,l.account_email LIMIT 1000`, [day]);
    const { notifyCollaboratorByEmail } = await import('@/lib/redaction/web-push');
    const { sendRhNotificationEmail } = await import('@/lib/redaction/rh/notification-email');
    const delivered: Array<{ email: string; type: string }> = [];
    for (const person of candidates.rows) {
      for (const reminder of [
        ...(person.missingExit ? [{ type: 'sortie', title: 'Votre sortie n’est pas encore signée', subject: 'Pensez à signer votre sortie', body: 'Votre pointage du jour ne comporte pas encore de signature de sortie. Si votre journée est terminée, vous pouvez la signer maintenant.', ctaLabel: 'Signer ma sortie', url: '/mon-rh/presence', audience: 'employee' as const }] : []),
        ...(person.missingActivity ? [{ type: 'prestation', title: 'Votre prestation n’est pas encore déclarée', subject: 'Pensez à déclarer votre prestation', body: 'Aucune déclaration n’a été enregistrée pour aujourd’hui. Si vous avez travaillé, vous pouvez la déclarer depuis votre espace RH.', ctaLabel: 'Déclarer ma prestation', url: '/mon-rh/prestations', audience: 'employee' as const }] : []),
      ]) {
        const inserted = await db().query(`INSERT INTO redaction_rh.work_reminders(collaborator_id,work_date,reminder_type)
          VALUES($1,$2::date,$3) ON CONFLICT DO NOTHING RETURNING collaborator_id`, [person.collaboratorId, day, reminder.type]);
        if (!inserted.rowCount) continue;
        const payload = { title: reminder.title, body: reminder.body, url: reminder.url };
        await Promise.allSettled([notifyCollaboratorByEmail(person.email, payload), sendRhNotificationEmail(person.email, payload)]);
        delivered.push({ email: person.email, type: reminder.type });
      }
    }
    return json({ day, reminders: delivered.length });
  } catch (error) { return handleError(error); }
}
