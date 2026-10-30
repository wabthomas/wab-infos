import { notFound, redirect } from 'next/navigation';
import { PaymentReceipt } from '@/components/redaction/rh/payment-receipt';
import { getMyWithdrawalReceipt } from '@/lib/redaction/rh/extras-db';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';

export const dynamic = 'force-dynamic';

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const principal = await requireRhPrincipal().catch(() => null);
  if (!principal) redirect('/profil');
  const { id } = await params;
  const receipt = await getMyWithdrawalReceipt(principal, id).catch(() => null);
  if (!receipt) notFound();
  return <PaymentReceipt person={receipt.person} withdrawal={receipt.withdrawal} />;
}
