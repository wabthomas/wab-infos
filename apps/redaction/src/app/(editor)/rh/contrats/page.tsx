import { redirect } from 'next/navigation';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { ContractsWorkspace } from '@/components/redaction/rh/contracts-workspace';

export default async function RhContractsPage() {
  let capabilities;
  try { capabilities = await getRhCapabilities(); } catch { redirect('/'); }
  if (!capabilities.accessManage || !(await getRhFlags()).contractsEnabled) redirect('/rh');
  return <ContractsWorkspace />;
}
