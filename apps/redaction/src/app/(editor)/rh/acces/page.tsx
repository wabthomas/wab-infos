import { redirect } from 'next/navigation';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';

export default async function RhAccessPage() {
  let capabilities;
  try { capabilities = await getRhCapabilities(); }
  catch { redirect('/'); }
  redirect(capabilities.accessManage ? '/rh/parametres' : '/rh');
}
