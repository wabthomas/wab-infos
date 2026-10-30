import { redirect } from 'next/navigation';
import { MyDisputes } from '@/components/redaction/rh/disputes';
import { getRhFlags } from '@/lib/redaction/rh/flags';

export default function MyDisputesPage() {
  if (!(await getRhFlags()).disputesEnabled) redirect('/mon-rh');
  return <MyDisputes />;
}
