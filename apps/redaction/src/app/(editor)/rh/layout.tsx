import { redirect } from 'next/navigation';
import { RhSectionShell } from '@/components/redaction/rh/rh-section-shell';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';
import { getRhFlags } from '@/lib/redaction/rh/flags';

export default async function RhLayout({ children }: { children: React.ReactNode }) {
  let capabilities;
  try {
    capabilities = await getRhCapabilities();
  } catch {
    redirect('/');
  }
  if (!capabilities.hrManage && !capabilities.financeManage && !capabilities.accessManage) {
    redirect('/');
  }
  return (
    <RhSectionShell mode="admin" capabilities={capabilities} flags={getRhFlags()}>
      {children}
    </RhSectionShell>
  );
}
