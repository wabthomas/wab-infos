import { redirect } from 'next/navigation';
import { RhWorkspace } from '@/components/redaction/rh/rh-workspace';
import { kinshasaToday } from '@/lib/redaction/rh/activities';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';

export default async function RhPage() {
  let capabilities;
  try { capabilities = await getRhCapabilities(); } catch { redirect('/'); }
  if (!capabilities.hrManage && !capabilities.financeManage && !capabilities.accessManage) redirect('/');
  const today = kinshasaToday();
  const financeEnabled = process.env.REDACTION_RH_FINANCE_ENABLED === 'true';
  return <RhWorkspace documentsEnabled={process.env.REDACTION_RH_DOCUMENTS_ENABLED === 'true'} capabilities={capabilities} month={today.slice(0, 7)} today={today} financeEnabled={financeEnabled} withdrawalsEnabled={financeEnabled && process.env.REDACTION_RH_WITHDRAWALS_ENABLED === 'true'} />;
}
