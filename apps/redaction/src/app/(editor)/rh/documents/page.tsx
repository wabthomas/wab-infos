import { redirect } from 'next/navigation';
import { Documents } from '@/components/redaction/rh/documents';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';
import { getRhFlags } from '@/lib/redaction/rh/flags';

export default async function RhDocumentsPage() {
  let capabilities;
  try {
    capabilities = await getRhCapabilities();
  } catch {
    redirect('/');
  }
  if (!capabilities.accessManage) redirect('/rh');
  return <Documents enabled={getRhFlags().documentsEnabled} />;
}
