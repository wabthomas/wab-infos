import { redirect } from 'next/navigation';
import { RhMediaLibrary } from '@/components/redaction/rh/media-library';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';

export default async function RhMediaPage() {
  let capabilities;
  try { capabilities = await getRhCapabilities(); } catch { redirect('/'); }
  if (!capabilities.accessManage) redirect('/rh');
  return <RhMediaLibrary />;
}
