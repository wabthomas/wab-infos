import { redirect } from 'next/navigation';
import { WithdrawalReview } from '@/components/redaction/rh/withdrawal-review';
import { kinshasaToday } from '@/lib/redaction/rh/activities';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';
import { getRhFlags } from '@/lib/redaction/rh/flags';

export default async function RhWithdrawalsPage() {
  let capabilities;
  try {
    capabilities = await getRhCapabilities();
  } catch {
    redirect('/');
  }
  if (!capabilities.financeManage) redirect('/rh');
  const flags = getRhFlags();
  return (
    <WithdrawalReview
      enabled={flags.withdrawalsEnabled}
      today={kinshasaToday()}
      allowOpening={capabilities.accessManage}
    />
  );
}
