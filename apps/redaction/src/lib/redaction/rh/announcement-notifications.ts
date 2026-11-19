import 'server-only';
import { db } from './database';
import { sendRhNotificationEmail } from './notification-email';
import { sendReleasePushToUser } from '../web-push';

export interface AnnouncementPayload {
  revision: string;
  title: string;
  body: string;
  url: string | null;
}

/** Diffuse seulement aux collaborateurs actifs liés à un compte. Les échecs d’un canal sont réessayables. */
export async function notifyAnnouncement(payload: AnnouncementPayload): Promise<{ recipients: number; emailSent: number; pushSent: number; failed: number }> {
  const rows = await db().query(`SELECT DISTINCT l.account_id AS "accountId", lower(l.account_email) AS email
    FROM redaction_rh.account_links l
    JOIN redaction_rh.collaborators c ON c.id=l.collaborator_id
    WHERE NOT c.archived AND l.account_email IS NOT NULL AND btrim(l.account_email)<>''
    ORDER BY l.account_id`);
  const recipients = rows.rows as Array<{ accountId: number; email: string }>;
  let emailSent = 0;
  let pushSent = 0;
  let failed = 0;
  const targetUrl = payload.url || '/mon-rh';
  const notice = {
    title: payload.title.slice(0, 140),
    subject: payload.title.slice(0, 140),
    body: payload.body.slice(0, 500),
    url: targetUrl,
    ctaLabel: 'Lire l’annonce',
    audience: 'employee' as const,
  };

  // Bounded concurrency keeps SMTP, Strapi and the RH pool responsive on larger teams.
  for (let offset = 0; offset < recipients.length; offset += 4) {
    const batch = recipients.slice(offset, offset + 4);
    const results = await Promise.all(batch.map(async ({ accountId, email }) => {
      await db().query('INSERT INTO redaction_rh.announcement_deliveries(account_id,revision) VALUES($1,$2) ON CONFLICT DO NOTHING', [accountId, payload.revision]);
      const [emailClaim, pushClaim] = await Promise.all([
        db().query(`UPDATE redaction_rh.announcement_deliveries SET email_claimed_at=now()
          WHERE account_id=$1 AND revision=$2 AND email_sent_at IS NULL
            AND (email_claimed_at IS NULL OR email_claimed_at<now()-interval '10 minutes') RETURNING account_id`, [accountId, payload.revision]),
        db().query(`UPDATE redaction_rh.announcement_deliveries SET push_claimed_at=now()
          WHERE account_id=$1 AND revision=$2 AND push_sent_at IS NULL
            AND (push_claimed_at IS NULL OR push_claimed_at<now()-interval '10 minutes') RETURNING account_id`, [accountId, payload.revision]),
      ]);
      const sends: Promise<{ channel: 'email' | 'push'; ok: boolean }>[] = [];
      if (emailClaim.rowCount) sends.push(sendRhNotificationEmail(email, notice).then(ok => ({ channel: 'email' as const, ok })));
      if (pushClaim.rowCount) sends.push(sendReleasePushToUser(email, notice).then(result => ({ channel: 'push' as const, ok: result.sent > 0 })));
      const outcomes = await Promise.allSettled(sends);
      let localFailed = 0;
      for (let index = 0; index < outcomes.length; index++) {
        const outcome = outcomes[index];
        if (outcome.status === 'rejected') { localFailed++; continue; }
        if (!outcome.value.ok) { localFailed++; continue; }
        if (outcome.value.channel === 'email') {
          emailSent++;
          await db().query('UPDATE redaction_rh.announcement_deliveries SET email_sent_at=now() WHERE account_id=$1 AND revision=$2', [accountId, payload.revision]);
        } else {
          pushSent++;
          await db().query('UPDATE redaction_rh.announcement_deliveries SET push_sent_at=now() WHERE account_id=$1 AND revision=$2', [accountId, payload.revision]);
        }
      }
      return localFailed;
    }));
    failed += results.reduce((sum, value) => sum + value, 0);
  }
  return { recipients: recipients.length, emailSent, pushSent, failed };
}
