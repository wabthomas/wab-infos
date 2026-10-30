import { redirect } from 'next/navigation';
import { MyDocuments } from '@/components/redaction/rh/documents';
import { getRhFlags } from '@/lib/redaction/rh/flags';

export default function MyDocumentsPage() {
  if (!getRhFlags().documentsEnabled) redirect('/mon-rh');
  return <MyDocuments />;
}
