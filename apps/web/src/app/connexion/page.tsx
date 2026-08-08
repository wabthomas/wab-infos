import type { Metadata } from 'next';
import { ReaderLoginForm } from '@/components/account/reader-login-form';
import { ReaderSurfacePage } from '@/components/account/reader-surface-page';
import { siteConfig } from '@/config/site';
import { generateStaticPageMetadata } from '@/lib/seo';

export const metadata: Metadata = generateStaticPageMetadata({
  title: 'Connexion lecteur',
  description: `Connectez-vous à votre compte lecteur ${siteConfig.name} pour soutenir le média et gérer vos préférences.`,
  path: '/connexion',
});

export default function ConnexionPage() {
  return (
    <ReaderSurfacePage
      title="Connexion lecteur"
      description="Accédez à votre compte lecteur pour soutenir Wab-infos et retrouver vos préférences."
      breadcrumbs={[{ name: 'Connexion' }]}
    >
      <ReaderLoginForm />
    </ReaderSurfacePage>
  );
}
