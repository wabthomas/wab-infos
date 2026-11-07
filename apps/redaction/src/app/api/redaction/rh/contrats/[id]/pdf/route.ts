import { getRhFlags } from '@/lib/redaction/rh/flags';
import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { db } from '@/lib/redaction/rh/database';
import { isContractId } from '@/lib/redaction/rh/contracts';
import { renderContractPdf } from '@/lib/redaction/rh/contract-pdf';
import { privateDocumentResponse } from '@/lib/redaction/rh/document-http';
import { json, handleError } from '@/lib/redaction/rh/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRhPermission('access_manage');
    if (!(await getRhFlags()).contractsEnabled) return json({ error: 'Contrats RH désactivés.' }, 503);
    const { id } = await params; if (!isContractId(id)) return json({ error: 'Contrat invalide.' }, 400);
    const found = await db().query(`SELECT k.*,to_char(k.start_date,'YYYY-MM-DD') AS start_text,to_char(k.end_date,'YYYY-MM-DD') AS end_text,c.first_name,c.last_name
      FROM redaction_rh.contract_cases k JOIN redaction_rh.collaborators c ON c.id=k.collaborator_id WHERE k.id=$1 AND k.status IN ('proposed','accepted')`,[id]);
    const row = found.rows[0]; if (!row) return json({ error: 'Contrat non disponible.' }, 404);
    const bytes = row.status==='accepted' ? row.pdf_bytes as Buffer : await renderContractPdf({ kind:row.kind,firstName:row.party_snapshot?.firstName || row.first_name,lastName:row.party_snapshot?.lastName || row.last_name,jobTitle:row.job_title,workLocation:row.work_location,startDate:row.start_text,endDate:row.end_text,salary:row.salary.toString(),currency:row.currency,clauses:row.clauses,signaturePlace:row.signature_place,signatureDate:row.signature_date instanceof Date ? row.signature_date.toISOString().slice(0,10) : row.signature_date,parties:row.party_snapshot,displayOptions:row.display_options ?? undefined,employer:row.employer_snapshot,sealBytes:row.seal_bytes,signatureBytes:row.signature_bytes });
    await db().query("INSERT INTO redaction_rh.contract_case_events(contract_id,actor_email,action) VALUES($1,$2,'download')",[id,actor.email]);
    return privateDocumentResponse(bytes,'pdf');
  } catch (error) { return handleError(error); }
}
