import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator, db } from '@/lib/redaction/rh/database';
import { handleError, json, validOrigin } from '@/lib/redaction/rh/api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    const person = await getMyCollaborator(principal);
    if (!person) return json({ error: 'Dossier RH indisponible.' }, 403);
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    const form = await request.formData();
    const file = form.get('photo');
    if (!(file instanceof File) || file.size < 16 || file.size > 2_000_000) return json({ error: 'Photo invalide (2 Mo maximum).' }, 400);
    const bytes = Buffer.from(await file.arrayBuffer());
    const type = file.type.toLowerCase();
    const valid = (type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8) || (type === 'image/png' && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) || (type === 'image/webp' && bytes.toString('ascii',8,12) === 'WEBP');
    if (!valid) return json({ error: 'Image non reconnue. Exportez la photo en JPG, PNG ou WebP.' }, 415);
    const client = await db().connect();
    try {
      await client.query('BEGIN');
      const link = await client.query('SELECT 1 FROM redaction_rh.account_links WHERE collaborator_id=$1 AND account_id=$2 AND account_email=$3 FOR UPDATE', [person.id,principal.id,principal.email]);
      if (!link.rowCount) { await client.query('ROLLBACK'); return json({ error: 'Dossier RH indisponible.' }, 403); }
      await client.query(`INSERT INTO redaction_rh.employee_profiles (collaborator_id,photo_bytes,photo_mime) VALUES ($1,$2,$3) ON CONFLICT (collaborator_id) DO UPDATE SET photo_bytes=EXCLUDED.photo_bytes,photo_mime=EXCLUDED.photo_mime,updated_at=now()`, [person.id,bytes,type]);
      await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id) VALUES ($1,$2,$3)', [principal.email,'profile_photo_update',person.id]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    return json({ photo: `data:${type};base64,${bytes.toString('base64')}` });
  } catch (error) { return handleError(error); }
}
