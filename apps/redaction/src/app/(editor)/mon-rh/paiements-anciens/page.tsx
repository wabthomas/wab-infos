import { RecordSheets } from '@/components/redaction/rh/record-sheets';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { MyHistoricalPayments } from '@/components/redaction/rh/my-historical-payments';

export default async function MyHistoricalPaymentsPage() {
  const flags = await getRhFlags();
  return <div className="space-y-5"><MyHistoricalPayments />{flags.withdrawalsEnabled && <RecordSheets type="paiements" />}</div>;
}
