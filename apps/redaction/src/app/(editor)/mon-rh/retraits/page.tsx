import { redirect } from 'next/navigation';
import { MyAdjustments } from '@/components/redaction/rh/adjustments';
import { MyWithdrawals } from '@/components/redaction/rh/my-withdrawals';
import { getRhFlags } from '@/lib/redaction/rh/flags';

export default function MyWithdrawalsPage() {
  if (!getRhFlags().withdrawalsEnabled) redirect('/mon-rh');
  return (
    <div className="space-y-5">
      <MyWithdrawals />
      <MyAdjustments />
    </div>
  );
}
