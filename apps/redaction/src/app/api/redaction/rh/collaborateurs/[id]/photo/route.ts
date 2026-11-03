import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { db } from '@/lib/redaction/rh/database';
import { isUuid } from '@/lib/redaction/rh/activities';
import { handleError, json, validOrigin } from '@/lib/redaction/rh/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRhPermission('team_read');
    const { id } = await params;
    if (!isUuid(id)) return new Response(null, { status: 400 });
    const result = await db().query('SELECT photo_bytes AS bytes, photo_mime AS mime FROM redaction_rh.employee_profiles WHERE collaborator_id=$1', [id]);
    const row = result.rows[0];
    if (!row?.bytes) return new Response(null, { status: 404 });
    return new Response(row.bytes, {
      headers: {
        'Content-Type': row.mime || 'image/jpeg',
        'Cache-Control': 'private, max-age=120',
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRhPermission('hr_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    const { id } = await params;
    if (!isUuid(id)) return json({ error: 'Collaborateur invalide.' }, 400);
    const person = await db().query('SELECT id FROM redaction_rh.collaborators WHERE id=$1 AND NOT archived', [id]);
    if (!person.rowCount) return json({ error: 'Collaborateur introuvable.' }, 404);
    const form = await request.formData();
    const file = form.get('photo');
    if (!(file instanceof File) || file.size < 16 || file.size > 2_000_000) {
      return json({ error: 'Photo invalide (2 Mo maximum).' }, 400);
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const type = file.type.toLowerCase();
    const valid =
      (type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8) ||
      (type === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
      (type === 'image/webp' && bytes.toString('ascii', 8, 12) === 'WEBP');
    if (!valid) return json({ error: 'Image non reconnue. Exportez la photo en JPG, PNG ou WebP.' }, 415);
    const client = await db().connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO redaction_rh.employee_profiles (collaborator_id,photo_bytes,photo_mime) VALUES ($1,$2,$3)
         ON CONFLICT (collaborator_id) DO UPDATE SET photo_bytes=EXCLUDED.photo_bytes,photo_mime=EXCLUDED.photo_mime,updated_at=now()`,
        [id, bytes, type]
      );
      await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id) VALUES ($1,$2,$3)', [actor.email, 'profile_photo_admin_update', id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return json({ photo: `data:${type};base64,${bytes.toString('base64')}` });
  } catch (error) {
    return handleError(error);
  }
}
