import { redirect } from 'next/navigation';
import { RhSectionShell } from '@/components/redaction/rh/rh-section-shell';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { isRhOnlyUser } from '@/lib/redaction/editorial-access';
import { requireRedactionUser } from '@/lib/redaction/strapi-editor';

export default async function RhLayout({ children }: { children: React.ReactNode }) {
  let capabilities;
  let rhOnly = false;
  try {
    const user = await requireRedactionUser();
    rhOnly = await isRhOnlyUser(user);
    capabilities = await getRhCapabilities();
  } catch {
    redirect('/');
  }
  if (!capabilities.teamRead && !capabilities.financeRead && !capabilities.hrManage && !capabilities.financeManage && !capabilities.accessManage) {
    redirect('/');
  }
  return (
    <RhSectionShell mode="admin" capabilities={capabilities} flags={await getRhFlags()} rhOnly={rhOnly}>
      {children}
    </RhSectionShell>
  );
}
