import { redirect } from 'next/navigation';
import { RedactionShell } from '@/components/redaction/redaction-shell';
import { getEditorProfile, requireRedactionUser } from '@/lib/redaction/strapi-editor';

export default async function RedactionEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const user = await requireRedactionUser();
    const { author } = await getEditorProfile(user);

    return <RedactionShell authorName={author.name}>{children}</RedactionShell>;
  } catch {
    redirect('/redaction/login');
  }
}
