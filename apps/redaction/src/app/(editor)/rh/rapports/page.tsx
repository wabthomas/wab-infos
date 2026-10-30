import { redirect } from 'next/navigation';
import { Reports } from '@/components/redaction/rh/reports';
import { kinshasaToday } from '@/lib/redaction/rh/activities';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';

export default async function RhReportsPage() {
  let capabilities;
  try {
    capabilities = await getRhCapabilities();
  } catch {
    redirect('/');
  }
  if (!capabilities.hrManage) redirect('/rh');
  return <Reports today={kinshasaToday()} />;
}
