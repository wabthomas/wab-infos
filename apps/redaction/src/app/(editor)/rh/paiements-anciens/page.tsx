import { RecordSheets } from '@/components/redaction/rh/record-sheets';
import { redirect } from 'next/navigation';
import { HistoricalPaymentReview } from '@/components/redaction/rh/historical-payment-review';
import { HistoricalPaymentReport } from '@/components/redaction/rh/historical-payment-report';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';
import { getRhFlags } from '@/lib/redaction/rh/flags';

export default async function HistoricalPaymentsPage() {
  const capabilities = await getRhCapabilities();
  const flags = await getRhFlags();
  if (!capabilities.financeRead || !flags.financeEnabled) redirect('/rh');
  return <div className="space-y-5">
    {flags.withdrawalsEnabled && <RecordSheets admin type="paiements" />}
    <HistoricalPaymentReport />
    <HistoricalPaymentReview readOnly={!capabilities.financeManage} />
  </div>;
}
