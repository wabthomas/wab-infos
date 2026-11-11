import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator, db } from '@/lib/redaction/rh/database';
import { handleError, json } from '@/lib/redaction/rh/api';
import { getRhFlags } from '@/lib/redaction/rh/flags';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const principal = await requireRhPrincipal();
    const person = await getMyCollaborator(principal);
    if (!person || !(await getRhFlags()).chatEnabled) return json({ error: 'Chat indisponible.' }, 403);
    const { id } = await params;
    if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return json({ error: 'Photo introuvable.' }, 404);
    const result = await db().query(`SELECT p.photo_bytes AS bytes,p.photo_mime AS mime
      FROM redaction_rh.collaborators c
      JOIN redaction_rh.employee_profiles p ON p.collaborator_id=c.id
      JOIN redaction_rh.account_links l ON l.collaborator_id=c.id
      WHERE c.id=$1 AND NOT c.archived AND c.id<>$2 AND (
        EXISTS (SELECT 1 FROM redaction_rh.chat_rooms r
          JOIN redaction_rh.chat_room_members me ON me.room_id=r.id AND me.collaborator_id=$2
          JOIN redaction_rh.chat_room_members other ON other.room_id=r.id AND other.collaborator_id=$1
          WHERE r.kind='private')
        OR EXISTS (SELECT 1 FROM redaction_rh.chat_rooms WHERE kind='group')
      )`, [id, person.id]);
    const photo = result.rows[0];
    if (!photo?.bytes || !['image/jpeg', 'image/png', 'image/webp'].includes(photo.mime)) return json({ error: 'Photo introuvable.' }, 404);
    return new Response(new Uint8Array(photo.bytes), { headers: { 'Content-Type': photo.mime, 'Cache-Control': 'private, max-age=60', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) { return handleError(error); }
}
