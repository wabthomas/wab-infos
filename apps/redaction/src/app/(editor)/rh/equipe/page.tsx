import { redirect } from 'next/navigation';
import { Collaborators } from '@/components/redaction/rh/collaborators';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';

export default async function RhTeamPage() {
  let capabilities;
  try {
    capabilities = await getRhCapabilities();
  } catch {
    redirect('/');
  }
  if (!capabilities.hrManage) redirect('/rh');
  return <Collaborators allowAccountLinks={capabilities.accessManage} />;
}
