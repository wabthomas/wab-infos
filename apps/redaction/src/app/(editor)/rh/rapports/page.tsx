import { RecordSheets } from '@/components/redaction/rh/record-sheets';
import { redirect } from 'next/navigation';
import { Reports } from '@/components/redaction/rh/reports';
import { AuditJournal } from '@/components/redaction/rh/audit-journal';
import { kinshasaToday } from '@/lib/redaction/rh/activities';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';
import { getRhFlags } from '@/lib/redaction/rh/flags';

export default async function RhReportsPage() {
  let capabilities;
  try {
    capabilities = await getRhCapabilities();
  } catch {
    redirect('/');
  }
  if (!capabilities.hrManage) redirect('/rh');
  const flags = await getRhFlags();
  return <div className="space-y-5"><Reports today={kinshasaToday()} /><RecordSheets admin allowPayments={capabilities.financeRead && flags.withdrawalsEnabled} />{capabilities.accessManage && <AuditJournal />}</div>;
}
