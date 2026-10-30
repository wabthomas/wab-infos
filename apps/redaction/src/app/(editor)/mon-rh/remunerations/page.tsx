import { redirect } from 'next/navigation';
import { MyRemunerations } from '@/components/redaction/rh/my-remunerations';
import { getRhFlags } from '@/lib/redaction/rh/flags';

export default function MyPayPage() {
  if (!getRhFlags().financeEnabled) redirect('/mon-rh');
  return <MyRemunerations />;
}
