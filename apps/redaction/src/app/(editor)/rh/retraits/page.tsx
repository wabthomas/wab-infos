import { redirect } from 'next/navigation';
import { WithdrawalReview } from '@/components/redaction/rh/withdrawal-review';
import { kinshasaToday } from '@/lib/redaction/rh/activities';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import type { RhCurrency } from '@/lib/redaction/rh/money';

export default async function RhWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let capabilities;
  try {
    capabilities = await getRhCapabilities();
  } catch {
    redirect('/');
  }
  if (!capabilities.financeRead) redirect('/rh');
  const flags = await getRhFlags();
  const params = await searchParams;
  const collaboratorId = typeof params.collaboratorId === 'string' ? params.collaboratorId : undefined;
  const requestedCurrency = typeof params.currency === 'string' ? params.currency.toUpperCase() : '';
  const currency: RhCurrency | undefined =
    requestedCurrency === 'USD' ? 'USD' : requestedCurrency === 'CDF' ? 'CDF' : undefined;
  return (
    <WithdrawalReview
      enabled={flags.withdrawalsEnabled}
      today={kinshasaToday()}
      allowOpening={capabilities.accessManage}
      readOnly={!capabilities.financeManage}
      initialCollaboratorId={collaboratorId}
      initialCurrency={currency}
    />
  );
}
