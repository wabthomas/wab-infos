import { redirect } from 'next/navigation';
import { RhCalendar } from '@/components/redaction/rh-calendar';
import { Remunerations } from '@/components/redaction/rh/remunerations';
import { kinshasaToday } from '@/lib/redaction/rh/activities';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import type { RhCurrency } from '@/lib/redaction/rh/money';

export default async function RhPayPage({
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
  const today = kinshasaToday();
  const params = await searchParams;
  const collaboratorId = typeof params.collaboratorId === 'string' ? params.collaboratorId : undefined;
  const requestedCurrency = typeof params.currency === 'string' ? params.currency.toUpperCase() : '';
  const currency: RhCurrency | undefined =
    requestedCurrency === 'USD' ? 'USD' : requestedCurrency === 'CDF' ? 'CDF' : undefined;
  return (
    <div className="space-y-5">
      <Remunerations
        enabled={flags.financeEnabled}
        withdrawalsEnabled={flags.withdrawalsEnabled}
        readOnly={!capabilities.financeManage}
        initialMonth={today.slice(0, 7)}
        initialPersonId={collaboratorId}
        initialCurrency={currency}
      />
      {capabilities.hrManage && <RhCalendar initialMonth={today.slice(0, 7)} />}
    </div>
  );
}
