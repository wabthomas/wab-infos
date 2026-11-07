import { createHash } from 'node:crypto';
import { pushContractAlert } from '@/lib/redaction/rh/contract-alerts';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { db } from '@/lib/redaction/rh/database';
import { isContractId } from '@/lib/redaction/rh/contracts';
import { renderContractPdf } from '@/lib/redaction/rh/contract-pdf';
import { readContractBody } from '@/lib/redaction/rh/contract-http';
import { json, handleError, validOrigin } from '@/lib/redaction/rh/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A signed submission is not approved until a separate authorised RH decision. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRhPermission('access_manage');
    if (!(await getRhFlags()).contractsEnabled) return json({ error:'Contrats RH désactivés.' },503);
    if (!validOrigin(request)) return json({ error:'Origine non autorisée.' },403);
    const { id } = await params;
    if (!isContractId(id)) return json({ error:'Contrat invalide.' },400);
    let raw: unknown;
    try { raw = await readContractBody(request); } catch { return json({ error:'Requête invalide.' },400); }
    const v = raw as Record<string,unknown> | null;
    if (!v || v.action !== 'approve' || !Number.isSafeInteger(v.version)) return json({ error:'Version ou action invalide.' },400);
    const client = await db().connect();
    try {
      await client.query('BEGIN');
      const found = await client.query(`SELECT k.*,to_char(k.start_date,'YYYY-MM-DD') AS start_text,to_char(k.end_date,'YYYY-MM-DD') AS end_text,c.first_name,c.last_name,c.archived
        FROM redaction_rh.contract_cases k JOIN redaction_rh.collaborators c ON c.id=k.collaborator_id
        WHERE k.id=$1 FOR UPDATE OF k,c`,[id]);
      const row = found.rows[0];
      if (!row || row.status !== 'pending_approval' || row.version !== v.version || row.archived
        || !row.consent_company_rules || !row.consent_work_rules || !row.employee_signature_bytes || !row.pdf_bytes) {
        await client.query('ROLLBACK'); return json({ error:'Signature absente ou dossier déjà traité/modifié.' },409);
      }
      const approvedAt = new Date();
      const pdf = await renderContractPdf({ kind:row.kind,firstName:row.party_snapshot?.firstName || row.first_name,lastName:row.party_snapshot?.lastName || row.last_name,
        jobTitle:row.job_title,workLocation:row.work_location,startDate:row.start_text,endDate:row.end_text,
        salary:row.salary.toString(),currency:row.currency,clauses:row.clauses,signaturePlace:row.signature_place,
        signatureDate:row.signature_date instanceof Date ? row.signature_date.toISOString().slice(0,10) : row.signature_date,
        parties:row.party_snapshot,employer:row.employer_snapshot,sealBytes:row.seal_bytes,signatureBytes:row.signature_bytes,
        employeeSignature:row.employee_signature,employeeSignatureBytes:row.employee_signature_bytes,
        acceptedAt:row.accepted_at.toISOString(),approvedAt:approvedAt.toISOString() });
      if (pdf.length > 5_000_000) { await client.query('ROLLBACK'); return json({ error:'PDF trop volumineux.' },413); }
      await client.query(`UPDATE redaction_rh.contract_cases SET status='accepted',approved_at=$2,approved_by=$3,
        pdf_bytes=$4,pdf_sha256=$5,version=version+1,updated_at=now() WHERE id=$1`,
        [id,approvedAt,actor.email,pdf,createHash('sha256').update(pdf).digest()]);
      await client.query("INSERT INTO redaction_rh.contract_case_events(contract_id,actor_email,action) VALUES($1,$2,'approve')",[id,actor.email]);
      await client.query('COMMIT');
      await pushContractAlert([row.proposed_account_email], 'approved');
      return json({ ok:true,status:'accepted' });
    } catch(error) { await client.query('ROLLBACK').catch(()=>undefined); throw error; }
    finally { client.release(); }
  } catch(error) { return handleError(error); }
}
