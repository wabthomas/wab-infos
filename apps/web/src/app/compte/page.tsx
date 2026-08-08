import type { Metadata } from 'next';
import { ReaderAccountPanel } from '@/components/account/reader-account-panel';
import { ReaderSurfacePage } from '@/components/account/reader-surface-page';
import { siteConfig } from '@/config/site';
import { generateStaticPageMetadata } from '@/lib/seo';

export const metadata: Metadata = generateStaticPageMetadata({
  title: 'Mon compte',
  description: `Compte lecteur ${siteConfig.name} : profil et soutien au média.`,
  path: '/compte',
});

export default function ComptePage() {
  return (
    <ReaderSurfacePage
      title="Mon compte"
      description="Votre espace lecteur Wab-infos."
      breadcrumbs={[{ name: 'Mon compte' }]}
    >
      <ReaderAccountPanel />
    </ReaderSurfacePage>
  );
}
