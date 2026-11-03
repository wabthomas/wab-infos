import { redirect } from 'next/navigation';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';
import { ContractsWorkspace } from '@/components/redaction/rh/contracts-workspace';

export default async function RhContractsPage() {
  let capabilities;
  try { capabilities = await getRhCapabilities(); } catch { redirect('/'); }
  if (!capabilities.accessManage) redirect('/rh');
  return <ContractsWorkspace />;
}
