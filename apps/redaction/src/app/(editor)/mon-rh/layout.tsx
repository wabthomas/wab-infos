import { redirect } from 'next/navigation';
import { RhSectionShell } from '@/components/redaction/rh/rh-section-shell';
import { getMyCollaborator } from '@/lib/redaction/rh/database';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';

export default async function MyRhLayout({ children }: { children: React.ReactNode }) {
  try {
    const person = await getMyCollaborator(await requireRhPrincipal());
    if (!person) redirect('/profil');
  } catch {
    redirect('/profil');
  }
  return (
    <RhSectionShell mode="employee" flags={await getRhFlags()}>
      {children}
    </RhSectionShell>
  );
}
