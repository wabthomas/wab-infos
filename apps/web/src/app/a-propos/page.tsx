import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal/legal-page';
import { editorialConfig, siteConfig } from '@/config/site';
import { generateStaticPageMetadata } from '@/lib/seo';

export const metadata: Metadata = generateStaticPageMetadata({
  title: 'À propos',
  description: `${siteConfig.name} : média d'information en ligne couvrant l'actualité congolaise, africaine et internationale depuis ${editorialConfig.foundedYear}.`,
  path: '/a-propos',
});

export default function AboutPage() {
  return (
    <LegalPage
      title="À propos de Wab-infos"
      description="Qui sommes-nous, notre mission éditoriale et notre ligne éditoriale."
      breadcrumbs={[{ name: 'À propos' }]}
    >
      <h2>Notre mission</h2>
      <p>
        <strong>{siteConfig.name}</strong> est un média d&apos;information en ligne dédié à
        l&apos;actualité de la <strong>République Démocratique du Congo</strong>, de l&apos;
        <strong>Afrique</strong> et du <strong>monde</strong>. Nous publions des articles
        d&apos;information, d&apos;analyse et de reportage dans les domaines politique, économique,
        social, sécuritaire, sportif et technologique.
      </p>

      <h2>Ligne éditoriale</h2>
      <p>
        Wab-infos s&apos;engage à fournir une information <strong>factuelle, vérifiable et
        indépendante</strong>. Nos articles sont signés par des journalistes identifiés. Les dates
        de publication et de mise à jour sont affichées sur chaque contenu.
      </p>
      <ul>
        <li>Couverture de l&apos;actualité RDC en temps réel</li>
        <li>Rubriques thématiques : politique, économie, sports, international, technologies…</li>
        <li>Wab-infos TV : direct, replays et émissions sur YouTube</li>
        <li>Newsletter quotidienne et alertes push pour les lecteurs abonnés</li>
      </ul>

      <h2>Équipe éditoriale</h2>
      <p>
        La rédaction est composée de journalistes et correspondants basés en RDC et à
        l&apos;international. Chaque auteur dispose d&apos;une page dédiée listant ses publications.
      </p>
      <p>
        Contact rédaction :{' '}
        <a href={`mailto:${editorialConfig.redactionEmail}`}>{editorialConfig.redactionEmail}</a>
      </p>

      <h2>Transparence</h2>
      <p>
        Wab-infos est financé par la publicité display (Google AdSense) et des partenariats
        médias. Les contenus sponsorisés, le cas échéant, sont clairement identifiés comme tels.
      </p>
      <p>
        Pour toute question éditoriale ou signalement :{' '}
        <Link href="/contact">page Contact</Link>.
      </p>
    </LegalPage>
  );
}
