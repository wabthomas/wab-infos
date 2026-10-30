import { redirect } from 'next/navigation';
import { Absences } from '@/components/redaction/rh/absences';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';

export default async function RhLeavePage() {
  let capabilities;
  try {
    capabilities = await getRhCapabilities();
  } catch {
    redirect('/');
  }
  if (!capabilities.hrManage) redirect('/rh');
  return <Absences />;
}
