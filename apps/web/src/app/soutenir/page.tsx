import type { Metadata } from 'next';
import { SupportCheckout } from '@/components/support/support-checkout';
import { ReaderSurfacePage } from '@/components/account/reader-surface-page';
import { siteConfig } from '@/config/site';
import { getSiteSettings } from '@/lib/site-settings.server';
import { generateStaticPageMetadata } from '@/lib/seo';
import { normalizeSiteSupportSettings } from '@wab-infos/shared';

export const metadata: Metadata = generateStaticPageMetadata({
  title: 'Soutenir',
  description: `Soutenez ${siteConfig.name} à partir de 1 $ — Mobile Money, carte bancaire ou crypto.`,
  path: '/soutenir',
});

export default async function SoutenirPage() {
  const settings = await getSiteSettings();
  const support = normalizeSiteSupportSettings(settings.chrome.support);

  return (
    <ReaderSurfacePage
      title={support.pageTitle}
      description={support.pageSubtitle}
      breadcrumbs={[{ name: support.headerButtonLabel || 'Soutenir' }]}
    >
      <SupportCheckout support={support} />
    </ReaderSurfacePage>
  );
}
