import { redirect } from 'next/navigation';
import { MyRemunerations } from '@/components/redaction/rh/my-remunerations';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import type { RhCurrency } from '@/lib/redaction/rh/money';

export default async function MyPayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const flags = getRhFlags();
  if (!flags.financeEnabled) redirect('/mon-rh');
  const params = await searchParams;
  const requested = typeof params.currency === 'string' ? params.currency.toUpperCase() : '';
  const currency: RhCurrency | undefined = requested === 'USD' ? 'USD' : requested === 'CDF' ? 'CDF' : undefined;
  return (
    <MyRemunerations
      enabled={flags.financeEnabled}
      withdrawalsEnabled={flags.withdrawalsEnabled}
      initialCurrency={currency}
    />
  );
}
