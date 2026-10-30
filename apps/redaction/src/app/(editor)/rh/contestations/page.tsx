import { redirect } from 'next/navigation';
import { DisputeReview } from '@/components/redaction/rh/disputes';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';
import { getRhFlags } from '@/lib/redaction/rh/flags';

export default async function RhDisputesPage() {
  let capabilities;
  try {
    capabilities = await getRhCapabilities();
  } catch {
    redirect('/');
  }
  if (!capabilities.accessManage) redirect('/rh');
  return <DisputeReview enabled={getRhFlags().disputesEnabled} />;
}
