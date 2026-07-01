import { redirect } from 'next/navigation';
import { RedactionShell } from '@/components/redaction/redaction-shell';
import { RedactionPushBanner, RedactionPushSetup } from '@/components/redaction/redaction-push-setup';
import { getEditorProfile, requireRedactionUser } from '@/lib/redaction/strapi-editor';

export default async function RedactionEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const user = await requireRedactionUser();
    const { author, isSuperAdmin } = await getEditorProfile(user);

    return (
      <>
        <RedactionPushSetup />
        <RedactionShell authorName={author.name} isSuperAdmin={isSuperAdmin}>
          {children}
        </RedactionShell>
      </>
    );
  } catch {
    redirect('/login');
  }
}
