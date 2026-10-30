import { redirect } from 'next/navigation';
import { MyAdjustments } from '@/components/redaction/rh/adjustments';
import { MyWithdrawals } from '@/components/redaction/rh/my-withdrawals';
import { PayoutMethods } from '@/components/redaction/rh/payout-methods';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import type { RhCurrency } from '@/lib/redaction/rh/money';

export default async function MyWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const flags = await getRhFlags();
  if (!flags.withdrawalsEnabled) redirect('/mon-rh');
  const params = await searchParams;
  const requested = typeof params.currency === 'string' ? params.currency.toUpperCase() : '';
  const currency: RhCurrency | undefined = requested === 'USD' ? 'USD' : requested === 'CDF' ? 'CDF' : undefined;
  return (
    <div className="space-y-5">
      <MyWithdrawals enabled={flags.withdrawalsEnabled} initialCurrency={currency} />
      <PayoutMethods />
      <MyAdjustments />
    </div>
  );
}
