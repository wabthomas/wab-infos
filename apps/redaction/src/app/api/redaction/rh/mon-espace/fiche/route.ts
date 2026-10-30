import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator, db } from '@/lib/redaction/rh/database';
import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';
const profileSelect = `birth_date AS "birthDate", employee_number AS "employeeNumber", work_location AS "workLocation", contract_type AS "contractType", to_char(contract_end_date,'YYYY-MM-DD') AS "contractEndDate", phone, work_email AS "workEmail", address, emergency_contact AS "emergencyContact", specialty, languages, signature, CASE WHEN photo_bytes IS NULL THEN NULL ELSE 'data:' || photo_mime || ';base64,' || encode(photo_bytes,'base64') END AS photo`;
const personalKeys = ['phone','workEmail','address','emergencyContact','specialty','languages','signature'] as const;
export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    const person = await getMyCollaborator(principal);
    if (!person) return json({ error: 'Dossier RH indisponible.' }, 403);
    const result = await db().query(`SELECT ${profileSelect} FROM redaction_rh.employee_profiles WHERE collaborator_id=$1`, [person.id]);
    return json({ profile: result.rows[0] ?? null });
  } catch (error) { return handleError(error); }
}
export async function PATCH(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    const person = await getMyCollaborator(principal);
    if (!person) return json({ error: 'Dossier RH indisponible.' }, 403);
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown;
    try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const input = body as Record<string, unknown>;
    const values: string[] = [];
    for (const key of personalKeys) {
      const value = input[key];
      if (typeof value !== 'string' || value.length > (key === 'address' ? 300 : key === 'workEmail' ? 320 : key === 'signature' ? 120 : 180) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) return json({ error: 'Vérifiez les champs de la fiche.' }, 400);
      values.push(value.trim());
    }
    const client = await db().connect();
    try {
      await client.query('BEGIN');
      const linked = await client.query(`SELECT 1 FROM redaction_rh.account_links WHERE collaborator_id=$1 AND account_id=$2 AND account_email=$3 FOR UPDATE`, [person.id, principal.id, principal.email]);
      if (!linked.rowCount) { await client.query('ROLLBACK'); return json({ error: 'Dossier RH indisponible.' }, 403); }
      await client.query(`INSERT INTO redaction_rh.employee_profiles (collaborator_id,phone,work_email,address,emergency_contact,specialty,languages,signature) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (collaborator_id) DO UPDATE SET phone=EXCLUDED.phone,work_email=EXCLUDED.work_email,address=EXCLUDED.address,emergency_contact=EXCLUDED.emergency_contact,specialty=EXCLUDED.specialty,languages=EXCLUDED.languages,signature=EXCLUDED.signature,updated_at=now()`, [person.id,...values]);
      await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id) VALUES ($1,$2,$3)', [principal.email,'profile_self_update',person.id]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    const result = await db().query(`SELECT ${profileSelect} FROM redaction_rh.employee_profiles WHERE collaborator_id=$1`, [person.id]);
    return json({ profile: result.rows[0] });
  } catch (error) { return handleError(error); }
}
