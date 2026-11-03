import { redirect } from 'next/navigation';
import { OfficialDocuments } from '@/components/redaction/rh/official-documents';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';

export default async function RhCorrespondancePage() {
  let capabilities;
  try { capabilities = await getRhCapabilities(); } catch { redirect('/'); }
  if (!capabilities.accessManage) redirect('/rh');
  return <OfficialDocuments />;
}
