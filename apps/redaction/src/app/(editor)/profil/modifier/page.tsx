import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getEditorProfile, requireRedactionUser } from '@/lib/redaction/strapi-editor';
import { ProfileEditForm } from '@/components/redaction/profile-edit-form';

export default async function RedactionEditProfilePage() {
  const user = await requireRedactionUser();
  const { author } = await getEditorProfile(user);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/profil"
          className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour au profil
        </Link>
        <h1 className="font-display text-2xl font-bold">Modifier le profil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Photo, nom, @username et informations publiques
        </p>
      </div>

      <ProfileEditForm initialAuthor={author} accountEmail={user.email} />
    </div>
  );
}
