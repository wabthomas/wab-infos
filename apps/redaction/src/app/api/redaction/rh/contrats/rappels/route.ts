import { timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/redaction/rh/database';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { pushContractAlert } from '@/lib/redaction/rh/contract-alerts';
import { json, handleError } from '@/lib/redaction/rh/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Run once daily with a private bearer secret; unique(contract_id,days_before) prevents duplicate reminders. */
export async function GET(request:Request) {
  const secret=process.env.REDACTION_RH_CONTRACT_CRON_SECRET;
  const supplied=request.headers.get('authorization')?.replace(/^Bearer /,'') || '';
  if (!secret || secret.length<32) return json({ error:'Rappels non configurés.' },503);
  const a=Buffer.from(secret), b=Buffer.from(supplied);
  if (a.length!==b.length || !timingSafeEqual(a,b)) return json({ error:'Non autorisé.' },401);
  try {
    const flags=await getRhFlags();
    if (!flags.contractsEnabled || !flags.notificationsEnabled) return json({ skipped:true });
    const today=new Date().toISOString().slice(0,10);
    const due=await db().query(`SELECT k.id,k.prepared_by,k.proposed_account_email,
      (k.end_date - $1::date)::integer AS days_before,
      CASE WHEN l.account_id=k.proposed_account_id AND l.account_email=k.proposed_account_email THEN l.account_email ELSE NULL END AS employee_email
      FROM redaction_rh.contract_cases k
      LEFT JOIN redaction_rh.account_links l ON l.collaborator_id=k.collaborator_id
      WHERE k.kind='CDD' AND k.status='accepted' AND k.end_date - $1::date IN (60,30,7,0)
      ORDER BY k.end_date,k.id LIMIT 500`,[today]);
    let scheduled=0;
    for (const row of due.rows) {
      const inserted=await db().query(`INSERT INTO redaction_rh.contract_reminders(contract_id,days_before)
        VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING contract_id`,[row.id,row.days_before]);
      if (!inserted.rowCount) continue;
      scheduled++;
      await pushContractAlert([row.prepared_by], 'termAdmin');
      await pushContractAlert([row.employee_email], 'term');
    }
    return json({ scheduled });
  } catch(error) { return handleError(error); }
}
