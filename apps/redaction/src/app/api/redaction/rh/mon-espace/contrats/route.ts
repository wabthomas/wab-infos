import { getRhFlags } from '@/lib/redaction/rh/flags';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { db } from '@/lib/redaction/rh/database';
import { json, handleError } from '@/lib/redaction/rh/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const principal = await requireRhPrincipal();
    if (!(await getRhFlags()).contractsEnabled) return json({ error: 'Contrats RH désactivés.' }, 503);
    const result = await db().query(`SELECT k.id,k.kind,k.job_title AS "jobTitle",k.work_location AS "workLocation",to_char(k.start_date,'YYYY-MM-DD') AS "startDate",to_char(k.end_date,'YYYY-MM-DD') AS "endDate",k.salary::text,k.currency,k.clauses,k.status,k.version,k.proposed_at AS "proposedAt",k.accepted_at AS "acceptedAt",k.approved_at AS "approvedAt",coalesce(k.party_snapshot->>'firstName',c.first_name) AS "firstName",coalesce(k.party_snapshot->>'lastName',c.last_name) AS "lastName",(k.employer_snapshot->>'companyName') AS "companyName"
      FROM redaction_rh.contract_cases k JOIN redaction_rh.collaborators c ON c.id=k.collaborator_id
      JOIN redaction_rh.account_links l ON l.collaborator_id=c.id
      WHERE NOT c.archived AND l.account_id=$1 AND l.account_email=$2 AND k.proposed_account_id=l.account_id AND k.proposed_account_email=l.account_email AND k.status IN ('proposed','pending_approval','accepted','declined')
      ORDER BY k.updated_at DESC,k.id DESC LIMIT 100`,[principal.id,principal.email]);
    return json({ contracts: result.rows });
  } catch (error) { return handleError(error); }
}
