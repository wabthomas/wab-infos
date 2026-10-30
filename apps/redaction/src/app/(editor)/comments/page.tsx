import { requireEditorialPageUser } from '@/lib/redaction/editorial-access';
import RedactionCommentsClient from './comments-client';

export default async function RedactionCommentsPage() {
  await requireEditorialPageUser();
  return <RedactionCommentsClient />;
}
