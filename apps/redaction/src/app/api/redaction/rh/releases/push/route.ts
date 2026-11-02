import { timingSafeEqual } from 'node:crypto';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { db } from '@/lib/redaction/rh/database';
import { RH_RELEASES, findRhRelease } from '@/lib/redaction/rh/releases';
import { sendReleasePushToUser } from '@/lib/redaction/web-push';
import { ensureFirebaseAdmin } from '@/lib/firebase/admin';
import { isFirebaseAdminConfigured } from '@/lib/firebase/config';
import { json, readBody } from '@/lib/redaction/rh/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(secret: string | null): boolean {
  const expected = process.env.REDACTION_RH_RELEASE_SECRET;
  if (!expected || !secret) return false;
  const a = Buffer.from(secret), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request.headers.get('x-rh-release-secret'))) return json({ error: 'Non autorisé.' }, 401);
  let input: unknown;
  try { input = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return json({ error: 'Requête invalide.' }, 400);
  const { id, cursor } = input as { id?: unknown; cursor?: unknown };
  if (typeof id !== 'string' || id.length > 100 || !RH_RELEASES.some((item) => item.id === id) || (cursor !== undefined && (!Number.isSafeInteger(cursor) || Number(cursor) < 0))) return json({ error: 'Annonce ou curseur invalide.' }, 400);
  if (!isFirebaseAdminConfigured() || !ensureFirebaseAdmin()) return json({ error: 'Firebase non configuré.' }, 503);
  const release = findRhRelease(id)!;
  if (release.requiresWithdrawals && !(await getRhFlags()).withdrawalsEnabled) return json({ error: 'Fonction retraits désactivée : annonce non diffusée.' }, 409);
  try {
    const recipients = await db().query(`SELECT l.account_id, l.account_email
      FROM redaction_rh.account_links l JOIN redaction_rh.collaborators c ON c.id=l.collaborator_id
      WHERE NOT c.archived AND l.account_id>$1 ORDER BY l.account_id LIMIT 10`, [cursor ?? 0]);
    let sent = 0;
    let failed = 0;
    for (const recipient of recipients.rows as Array<{ account_id: number; account_email: string }>) {
      const claim = await db().query(`INSERT INTO redaction_rh.release_push_deliveries (account_id,release_id) VALUES ($1,$2)
        ON CONFLICT (account_id,release_id) DO UPDATE SET claimed_at=now()
        WHERE release_push_deliveries.sent_at IS NULL
          AND release_push_deliveries.claimed_at < now()-interval '10 minutes'
        RETURNING account_id`, [recipient.account_id, release.id]);
      if (!claim.rowCount) continue;
      try {
        const result = await sendReleasePushToUser(recipient.account_email, {
          title: release.title,
          body: release.body,
          url: release.url,
        });
        sent += result.sent;
        failed += result.failed;
        if (result.sent > 0) {
          await db().query(`UPDATE redaction_rh.release_push_deliveries SET sent_at=now() WHERE account_id=$1 AND release_id=$2 AND sent_at IS NULL`, [recipient.account_id, release.id]);
        }
      } catch {
        failed++;
      }
    }
    return json({ sent, failed, nextCursor: recipients.rows.length === 10 ? recipients.rows[9].account_id : null });
  } catch {
    return json({ error: 'Diffusion RH indisponible. Vérifiez la migration et la configuration.' }, 503);
  }
}
