import { redirect } from 'next/navigation';
import { RhReleasePopup } from '@/components/redaction/rh/release-popup';
import { RhSectionShell } from '@/components/redaction/rh/rh-section-shell';
import { getMyCollaborator } from '@/lib/redaction/rh/database';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';

export default async function MyRhLayout({ children }: { children: React.ReactNode }) {
  let accountId: number;
  try {
    const principal = await requireRhPrincipal();
    accountId = principal.id;
    const person = await getMyCollaborator(principal);
    if (!person) redirect('/profil');
  } catch {
    redirect('/profil');
  }
  return (
    <RhSectionShell mode="employee" flags={await getRhFlags()}>
      <RhReleasePopup accountId={accountId} />
      {children}
    </RhSectionShell>
  );
}
