import { randomInt } from 'node:crypto';
import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { db } from '@/lib/redaction/rh/database';
import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRhPermission('team_read');
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Identifiant invalide.' },400);
    const result=await db().query(`SELECT birth_date AS "birthDate",employee_number AS "employeeNumber",work_location AS "workLocation",contract_type AS "contractType",to_char(contract_end_date,'YYYY-MM-DD') AS "contractEndDate" FROM redaction_rh.employee_profiles WHERE collaborator_id=$1`,[id]);
    return json({profile:result.rows[0]??null});
  } catch(error){return handleError(error);}
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRhPermission('hr_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' },403);
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Identifiant invalide.' },400);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' },400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' },400);
    const v=body as Record<string,unknown>;
    const date=(x:unknown) => typeof x==='string' && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null;
    const birthDate=date(v.birthDate), contractEndDate=v.contractEndDate===''||v.contractEndDate===null?null:date(v.contractEndDate);
    if (!birthDate || (v.contractEndDate && !contractEndDate)) return json({error:'Date de naissance ou de fin de contrat invalide.'},400);
    const str=(key:string,max:number,required=false) => { const x=v[key]; if(typeof x!=='string'||x.trim().length>max||(required&&!x.trim())) throw new Error('invalid'); return x.trim(); };
    let workLocation:string, contractType:string;
    try { workLocation=str('workLocation',180,true); contractType=str('contractType',100,true); } catch { return json({error:'Le lieu d’affectation et le type de contrat sont obligatoires.'},400); }
    const client=await db().connect();
    try {
      await client.query('BEGIN');
      const account=await client.query('SELECT account_id FROM redaction_rh.account_links WHERE collaborator_id=$1',[id]);
      if(!account.rowCount){await client.query('ROLLBACK');return json({error:'Liez d’abord un compte au dossier pour attribuer le matricule.'},409);}
      const accountId=String(account.rows[0].account_id);
      let number='';
      for(let tries=0;tries<8;tries++) {
        number=`WC-EMP-${birthDate.slice(2,4)}15${String(randomInt(0,1000)).padStart(3,'0')}${accountId}`;
        const exists=await client.query('SELECT 1 FROM redaction_rh.employee_profiles WHERE employee_number=$1 AND collaborator_id<>$2',[number,id]);
        if(!exists.rowCount) break;
      }
      await client.query(`INSERT INTO redaction_rh.employee_profiles (collaborator_id,birth_date,employee_number,work_location,contract_type,contract_end_date) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (collaborator_id) DO UPDATE SET birth_date=EXCLUDED.birth_date,employee_number=CASE WHEN redaction_rh.employee_profiles.birth_date IS DISTINCT FROM EXCLUDED.birth_date OR redaction_rh.employee_profiles.employee_number IS NULL THEN EXCLUDED.employee_number ELSE redaction_rh.employee_profiles.employee_number END,work_location=EXCLUDED.work_location,contract_type=EXCLUDED.contract_type,contract_end_date=EXCLUDED.contract_end_date,updated_at=now()`,[id,birthDate,number,workLocation,contractType,contractEndDate]);
      await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action,collaborator_id) VALUES ($1,$2,$3)',[actor.email,'profile_admin_update',id]);
      await client.query('COMMIT');
    } catch(error) {await client.query('ROLLBACK'); if(error instanceof Error&&error.message==='invalid')return json({error:'Vérifiez les champs.'},400);throw error;} finally {client.release();}
    const profile=await db().query(`SELECT birth_date AS "birthDate",employee_number AS "employeeNumber",work_location AS "workLocation",contract_type AS "contractType",to_char(contract_end_date,'YYYY-MM-DD') AS "contractEndDate" FROM redaction_rh.employee_profiles WHERE collaborator_id=$1`,[id]);
    return json({profile:profile.rows[0]});
  } catch(error){return handleError(error);}
}
