import { redirect } from 'next/navigation';
import { RhCalendar } from '@/components/redaction/rh-calendar';
import { Remunerations } from '@/components/redaction/rh/remunerations';
import { kinshasaToday } from '@/lib/redaction/rh/activities';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';
import { getRhFlags } from '@/lib/redaction/rh/flags';

export default async function RhPayPage() {
  let capabilities;
  try {
    capabilities = await getRhCapabilities();
  } catch {
    redirect('/');
  }
  if (!capabilities.financeManage) redirect('/rh');
  const flags = getRhFlags();
  const today = kinshasaToday();
  return (
    <div className="space-y-5">
      <Remunerations enabled={flags.financeEnabled} initialMonth={today.slice(0, 7)} />
      <RhCalendar initialMonth={today.slice(0, 7)} />
    </div>
  );
}
