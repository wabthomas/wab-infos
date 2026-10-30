import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator, db } from '@/lib/redaction/rh/database';
import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';
import { COUNTRIES, LANGUAGES, RDC_PROVINCES } from '@/lib/redaction/rh/geo';

export const dynamic = 'force-dynamic';
const profileSelect = `to_char(p.birth_date,'YYYY-MM-DD') AS "birthDate", p.employee_number AS "employeeNumber", p.work_location AS "workLocation", p.contract_type AS "contractType", to_char(p.contract_end_date,'YYYY-MM-DD') AS "contractEndDate", p.phone, p.work_email AS "workEmail", p.address, p.country, p.province, p.city, p.emergency_contact AS "emergencyContact", p.specialty, p.languages, p.signature, CASE WHEN p.photo_bytes IS NULL THEN NULL ELSE 'data:' || p.photo_mime || ';base64,' || encode(p.photo_bytes,'base64') END AS photo, to_char(c.start_date,'YYYY-MM-DD') AS "startDate"`;
const personalKeys = ['phone','workEmail','address','country','province','city','emergencyContact','specialty','languages','signature'] as const;
const profileQuery = `SELECT ${profileSelect} FROM redaction_rh.collaborators c LEFT JOIN redaction_rh.employee_profiles p ON p.collaborator_id=c.id WHERE c.id=$1`;
function validDate(value: unknown): value is string { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const date = new Date(`${value}T00:00:00.000Z`); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value && value >= '1900-01-01' && value <= new Date().toISOString().slice(0,10); }
export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    const person = await getMyCollaborator(principal);
    if (!person) return json({ error: 'Dossier RH indisponible.' }, 403);
    const result = await db().query(profileQuery, [person.id]);
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
    const birthDate = input.birthDate === '' || input.birthDate === null ? null : validDate(input.birthDate) ? input.birthDate : undefined;
    const startDate = input.startDate === '' || input.startDate === null ? null : validDate(input.startDate) ? input.startDate : undefined;
    if (birthDate === undefined || startDate === undefined) return json({ error: 'Vérifiez la date de naissance et la date d’arrivée.' }, 400);
    const values: string[] = [];
    for (const key of personalKeys) {
      const value = input[key];
      if (typeof value !== 'string' || value.length > (key === 'address' ? 300 : key === 'workEmail' ? 320 : key === 'signature' ? 120 : key === 'languages' ? 300 : key === 'phone' ? 40 : ['country','province','city'].includes(key) ? 100 : 180) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) return json({ error: 'Vérifiez les champs de la fiche.' }, 400);
      values.push(value.trim());
    }
    if (values[1] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[1])) return json({ error: 'Adresse e-mail invalide.' }, 400);
    const country = String(input.country).trim(), province = String(input.province).trim(), city = String(input.city).trim();
    if (!COUNTRIES.includes(country as (typeof COUNTRIES)[number])) return json({ error: 'Pays invalide.' }, 400);
    const selectedLanguages = values[8].split(', ').filter(Boolean);
    if (selectedLanguages.some((language) => !LANGUAGES.includes(language as (typeof LANGUAGES)[number]))) return json({ error: 'Langue invalide.' }, 400);
    if (country === COUNTRIES[0] && (!RDC_PROVINCES[province] || !RDC_PROVINCES[province].includes(city))) return json({ error: 'Choisissez une province et une ville de RDC valides.' }, 400);
    const client = await db().connect();
    try {
      await client.query('BEGIN');
      const linked = await client.query(`SELECT 1 FROM redaction_rh.account_links WHERE collaborator_id=$1 AND account_id=$2 AND account_email=$3 FOR UPDATE`, [person.id, principal.id, principal.email]);
      if (!linked.rowCount) { await client.query('ROLLBACK'); return json({ error: 'Dossier RH indisponible.' }, 403); }
      await client.query(`INSERT INTO redaction_rh.employee_profiles (collaborator_id,birth_date,phone,work_email,address,country,province,city,emergency_contact,specialty,languages,signature) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (collaborator_id) DO UPDATE SET birth_date=EXCLUDED.birth_date,employee_number=CASE WHEN redaction_rh.employee_profiles.birth_date IS DISTINCT FROM EXCLUDED.birth_date THEN NULL ELSE redaction_rh.employee_profiles.employee_number END,phone=EXCLUDED.phone,work_email=EXCLUDED.work_email,address=EXCLUDED.address,country=EXCLUDED.country,province=EXCLUDED.province,city=EXCLUDED.city,emergency_contact=EXCLUDED.emergency_contact,specialty=EXCLUDED.specialty,languages=EXCLUDED.languages,signature=EXCLUDED.signature,updated_at=now()`, [person.id,birthDate,...values]);
      await client.query('UPDATE redaction_rh.collaborators SET start_date=$1,version=version+1,updated_at=now() WHERE id=$2', [startDate,person.id]);
      await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id) VALUES ($1,$2,$3)', [principal.email,'profile_self_update',person.id]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    const result = await db().query(profileQuery, [person.id]);
    return json({ profile: result.rows[0] });
  } catch (error) { return handleError(error); }
}
