import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator, db } from '@/lib/redaction/rh/database';
import { handleError, json } from '@/lib/redaction/rh/api';
import { getRhFlags } from '@/lib/redaction/rh/flags';

export const dynamic = 'force-dynamic';
const uuid = (value: string) => /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const principal = await requireRhPrincipal();
    const person = await getMyCollaborator(principal);
    if (!person || !(await getRhFlags()).chatEnabled) return json({ error: 'Chat indisponible.' }, 403);
    const { id } = await params;
    if (!uuid(id)) return json({ error: 'Conversation introuvable.' }, 404);
    // Only the other participant of a private room shared with this collaborator.
    // Never use an arbitrary contact ID from the browser to disclose profile data.
    const result = await db().query(`SELECT c.id,c.first_name AS "firstName",c.last_name AS "lastName",
      p.phone,p.work_email AS email
      FROM redaction_rh.chat_rooms r
      JOIN redaction_rh.chat_room_members me ON me.room_id=r.id AND me.collaborator_id=$2
      JOIN redaction_rh.chat_room_members other ON other.room_id=r.id AND other.collaborator_id<>$2
      JOIN redaction_rh.collaborators c ON c.id=other.collaborator_id AND NOT c.archived
      LEFT JOIN redaction_rh.employee_profiles p ON p.collaborator_id=c.id
      WHERE r.id=$1 AND r.kind='private' LIMIT 1`, [id, person.id]);
    if (!result.rowCount) return json({ error: 'Contact introuvable.' }, 404);
    return json({ contact: result.rows[0] });
  } catch (error) { return handleError(error); }
}
