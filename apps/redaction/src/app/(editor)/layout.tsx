import { redirect } from 'next/navigation';
import { RedactionShell } from '@/components/redaction/redaction-shell';
import { RedactionPushBanner, RedactionPushSetup } from '@/components/redaction/redaction-push-setup';
import {
  countPendingComments,
  getEditorProfile,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';

export default async function RedactionEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const user = await requireRedactionUser();
    const [{ author, isSuperAdmin }, pendingComments] = await Promise.all([
      getEditorProfile(user),
      countPendingComments(),
    ]);

    return (
      <>
        <RedactionPushSetup />
        <RedactionShell
          authorName={author.name}
          isSuperAdmin={isSuperAdmin}
          initialPendingComments={pendingComments}
        >
          {children}
        </RedactionShell>
      </>
    );
  } catch {
    redirect('/login');
  }
}
