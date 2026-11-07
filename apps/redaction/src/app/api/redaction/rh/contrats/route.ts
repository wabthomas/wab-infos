import { getRhFlags } from '@/lib/redaction/rh/flags';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { db } from '@/lib/redaction/rh/database';
import { json, handleError, validOrigin } from '@/lib/redaction/rh/api';
import { readContractBody } from '@/lib/redaction/rh/contract-http';
import { validateContractInput, isContractId } from '@/lib/redaction/rh/contracts';
import { contractPartiesFromProfile } from '@/lib/redaction/rh/contract-parties';
import { DEFAULT_ORGANIZATION_SETTINGS } from '@/lib/redaction/rh/organization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const projection = `k.id,k.collaborator_id AS "collaboratorId",k.kind,k.job_title AS "jobTitle",k.work_location AS "workLocation",to_char(k.start_date,'YYYY-MM-DD') AS "startDate",to_char(k.end_date,'YYYY-MM-DD') AS "endDate",k.salary::text,k.currency,k.clauses,k.birth_place AS "birthPlace",k.signature_place AS "signaturePlace",to_char(k.signature_date,'YYYY-MM-DD') AS "signatureDate",k.version,k.status,k.prepared_by AS "preparedBy",k.proposed_at AS "proposedAt",k.accepted_at AS "acceptedAt",k.employee_signature AS "employeeSignature",k.display_options AS "displayOptions",c.first_name AS "firstName",c.last_name AS "lastName"`;

export async function GET(request: Request) {
  try {
    await requireRhPermission('access_manage');
    if (!(await getRhFlags()).contractsEnabled) return json({ error: 'Contrats RH désactivés.' }, 503);
    const id = new URL(request.url).searchParams.get('id');
    if (id && !isContractId(id)) return json({ error: 'Contrat invalide.' }, 400);
    const result = await db().query(`SELECT ${projection} FROM redaction_rh.contract_cases k JOIN redaction_rh.collaborators c ON c.id=k.collaborator_id WHERE k.status<>'archived' ${id ? 'AND k.id=$1' : ''} ORDER BY k.updated_at DESC,k.id DESC LIMIT ${id ? 1 : 200}`, id ? [id] : []);
    return json({ contracts: result.rows });
  } catch (error) { return handleError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRhPermission('access_manage');
    if (!(await getRhFlags()).contractsEnabled) return json({ error: 'Contrats RH désactivés.' }, 503);
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let raw: unknown; try { raw = await readContractBody(request); } catch { return json({ error: 'Dossier trop long ou invalide.' }, 400); }
    const input = validateContractInput(raw);
    if (!input) return json({ error: 'Vérifiez les champs CDD/CDI, dates, rémunération et clauses.' }, 400);
    const client = await db().connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(`INSERT INTO redaction_rh.contract_cases(id,collaborator_id,kind,job_title,work_location,start_date,end_date,salary,currency,clauses,birth_place,signature_place,signature_date,prepared_by)
        SELECT $1,id,$3,$4,$5,$6,$7,$8,$9,$10,$12,$13,$14,$11 FROM redaction_rh.collaborators WHERE id=$2 AND NOT archived RETURNING id`,[randomUUID(),input.collaboratorId,input.kind,input.jobTitle,input.workLocation,input.startDate,input.endDate,input.salary,input.currency,input.clauses,actor.email,input.birthPlace,input.signaturePlace,input.signatureDate,JSON.stringify(input.displayOptions)]);
      if (!result.rowCount) { await client.query('ROLLBACK'); return json({ error: 'Dossier collaborateur introuvable.' }, 409); }
      await client.query("INSERT INTO redaction_rh.contract_case_events(contract_id,actor_email,action) VALUES($1,$2,'create')",[result.rows[0].id,actor.email]);
      await client.query('COMMIT'); return json({ id: result.rows[0].id }, 201);
    } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
    finally { client.release(); }
  } catch (error) { return handleError(error); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireRhPermission('access_manage');
    if (!(await getRhFlags()).contractsEnabled) return json({ error: 'Contrats RH désactivés.' }, 503);
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let raw: unknown; try { raw = await readContractBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return json({ error: 'Requête invalide.' }, 400);
    const v = raw as Record<string,unknown>;
    if (!isContractId(v.id) || !Number.isSafeInteger(v.version) || Number(v.version)<1 || !['update','propose','archive'].includes(v.action as string)) return json({ error: 'Action ou version invalide.' }, 400);
    const input = v.action === 'update' ? validateContractInput(v.contract) : null;
    if (v.action === 'update' && !input) return json({ error: 'Données contractuelles invalides.' }, 400);
    if (v.action === 'propose' && (v.legalApproved !== true || v.dgApproved !== true || v.directorAuthorized !== true)) return json({ error: 'Validation juridique, habilitation du DG vérifiée et accord réel du DG requis.' }, 400);
    const client = await db().connect();
    try {
      await client.query('BEGIN');
      const locked = await client.query(`SELECT k.collaborator_id,k.status,k.version,k.birth_place,k.signature_place,k.signature_date,c.first_name,c.last_name,c.archived FROM redaction_rh.contract_cases k JOIN redaction_rh.collaborators c ON c.id=k.collaborator_id WHERE k.id=$1 FOR UPDATE OF k,c`,[v.id]);
      const row = locked.rows[0];
      if (!row || row.status !== 'draft' || row.archived || row.version !== v.version) { await client.query('ROLLBACK'); return json({ error: 'Brouillon modifié, déjà transmis ou indisponible.' }, 409); }
      if (v.action === 'update' && input!.collaboratorId !== row.collaborator_id) { await client.query('ROLLBACK'); return json({ error: 'Changer de collaborateur nécessite un nouveau contrat.' }, 409); }
      if (v.action === 'update') {
        await client.query(`UPDATE redaction_rh.contract_cases SET kind=$2,job_title=$3,work_location=$4,start_date=$5,end_date=$6,salary=$7,currency=$8,clauses=$9,birth_place=$10,signature_place=$11,signature_date=$12,display_options=$13,version=version+1,updated_at=now() WHERE id=$1`,[v.id,input!.kind,input!.jobTitle,input!.workLocation,input!.startDate,input!.endDate,input!.salary,input!.currency,input!.clauses,input!.birthPlace,input!.signaturePlace,input!.signatureDate,JSON.stringify(input!.displayOptions)]);
      } else if (v.action === 'archive') {
        await client.query("UPDATE redaction_rh.contract_cases SET status='archived',version=version+1,updated_at=now() WHERE id=$1",[v.id]);
      } else {
        if (!row.signature_place?.trim() || !row.signature_date) { await client.query('ROLLBACK'); return json({ error: 'Configurez le lieu et la date de signature du modèle puis enregistrez le contrat avant transmission.' }, 409); }
        const link = await client.query('SELECT account_id,account_email FROM redaction_rh.account_links WHERE collaborator_id=$1',[row.collaborator_id]);
        if (!link.rowCount || link.rows[0].account_id === actor.id) { await client.query('ROLLBACK'); return json({ error: 'Liaison collaborateur distincte obligatoire avant transmission.' }, 409); }
        const settings = { ...DEFAULT_ORGANIZATION_SETTINGS };
        const saved = await client.query('SELECT setting_key,setting_value FROM redaction_rh.organization_settings');
        for (const item of saved.rows) if (Object.hasOwn(settings,item.setting_key)) (settings as Record<string,string>)[item.setting_key] = item.setting_value;
        const assets = await client.query("SELECT asset_key,file_bytes FROM redaction_rh.organization_assets WHERE asset_key IN ('director-signature','company-seal','company-logo')");
        const asset = Object.fromEntries(assets.rows.map(item => [item.asset_key,item.file_bytes]));
        if (!settings.companyName.trim() || !settings.directorName.trim() || !asset['director-signature'] || !asset['company-seal']) { await client.query('ROLLBACK'); return json({ error: 'Configurez l’entreprise, le DG, son image de signature et le sceau avant transmission.' }, 409); }
        // Preserve the logo at transmission: a later change in organization settings must not alter this contract.
        let logoPng: string | null = null;
        if (asset['company-logo']) {
          try {
            const bytes = await sharp(asset['company-logo'] as Buffer, { limitInputPixels: 12_000_000 })
              .resize(400, 240, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
            logoPng = `data:image/png;base64,${bytes.toString('base64')}`;
          } catch { await client.query('ROLLBACK'); return json({ error: 'Le logo de l’entreprise ne peut pas être intégré au contrat.' }, 409); }
        }
        const identity = await client.query(`SELECT to_char(p.birth_date,'YYYY-MM-DD') AS "birthDate",p.address,p.phone,p.city
          FROM redaction_rh.employee_profiles p WHERE p.collaborator_id=$1`,[row.collaborator_id]);
        const parties = contractPartiesFromProfile(identity.rows[0] || null, row.birth_place);
        if (!parties || !row.first_name?.trim() || !row.last_name?.trim()) { await client.query('ROLLBACK'); return json({ error: 'Complétez la date de naissance, l’adresse et le téléphone dans la fiche d’identification, et le lieu de naissance dans le contrat avant transmission.' }, 409); }
        const partySnapshot = { ...parties, firstName:row.first_name.trim(), lastName:row.last_name.trim() };
        const employerSnapshot = { ...settings, logoPng, directorAuthorized: true };
        await client.query(`UPDATE redaction_rh.contract_cases SET status='proposed',legal_reviewed_by=$2,proposed_at=now(),proposed_account_id=$3,proposed_account_email=$4,employer_snapshot=$5,signature_bytes=$6,seal_bytes=$7,party_snapshot=$8,version=version+1,updated_at=now() WHERE id=$1`,[v.id,actor.email,link.rows[0].account_id,link.rows[0].account_email,JSON.stringify(employerSnapshot),asset['director-signature'],asset['company-seal'],JSON.stringify(partySnapshot)]);
      }
      await client.query('INSERT INTO redaction_rh.contract_case_events(contract_id,actor_email,action) VALUES($1,$2,$3)',[v.id,actor.email,v.action]);
      await client.query('COMMIT'); return json({ ok: true });
    } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
    finally { client.release(); }
  } catch (error) { return handleError(error); }
}
