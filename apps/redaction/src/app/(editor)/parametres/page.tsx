import { redirect } from 'next/navigation';
import { SiteSettingsForm } from '@/components/redaction/site-settings-form';
import { getEditorProfile, isRedactionSuperAdmin, requireRedactionUser } from '@/lib/redaction/strapi-editor';

export default async function RedactionSettingsPage() {
  const user = await requireRedactionUser();
  if (!isRedactionSuperAdmin(user)) {
    redirect('/');
  }

  const { author } = await getEditorProfile(user);

  return (
    <div className="space-y-4">
      <div className="lg:hidden">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Administration</p>
        <h1 className="font-display text-xl font-bold">Paramètres du site</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bandeau PWA/APK, en-tête, sections d&apos;accueil, vues et réseaux sociaux — {author.name}
        </p>
      </div>
      <SiteSettingsForm authorName={author.name} />
    </div>
  );
}
