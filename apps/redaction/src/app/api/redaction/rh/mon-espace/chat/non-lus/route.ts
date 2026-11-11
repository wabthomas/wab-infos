import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator, db } from '@/lib/redaction/rh/database';
import { handleError, json } from '@/lib/redaction/rh/api';
import { getRhFlags } from '@/lib/redaction/rh/flags';

export const dynamic = 'force-dynamic';

/** Le badge compte uniquement les messages d'autrui auxquels ce compte a accès.
 * Sans la migration des accusés de lecture, aucun faux nombre « non lu » n'est affiché. */
export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    const person = await getMyCollaborator(principal);
    if (!person) return json({ error: 'Dossier RH indisponible.' }, 403);
    if (!(await getRhFlags()).chatEnabled) return json({ error: 'Chat RH désactivé.' }, 503);
    const available = await db().query("SELECT to_regclass('redaction_rh.chat_room_reads') IS NOT NULL AS ready");
    if (!available.rows[0].ready) return json({ count: 0, receiptsReady: false });
    const result = await db().query(`SELECT count(*)::int AS count FROM (
      SELECT 1 FROM redaction_rh.chat_messages m
      JOIN redaction_rh.chat_rooms r ON r.id=m.room_id
      LEFT JOIN redaction_rh.chat_room_reads read ON read.room_id=m.room_id AND read.collaborator_id=$1
      WHERE m.sender_id<>$1
        AND (r.kind='group' OR EXISTS(
          SELECT 1 FROM redaction_rh.chat_room_members member
          WHERE member.room_id=r.id AND member.collaborator_id=$1
        ))
        AND (read.read_at IS NULL OR m.created_at>read.read_at)
      LIMIT 100
    ) unread`, [person.id]);
    return json({ count: result.rows[0].count, receiptsReady: true });
  } catch (error) { return handleError(error); }
}
