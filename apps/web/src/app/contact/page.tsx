import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import { editorialConfig, siteConfig } from '@/config/site';
import { generateStaticPageMetadata } from '@/lib/seo';

export const metadata: Metadata = generateStaticPageMetadata({
  title: 'Contact',
  description: `Contactez la rédaction de ${siteConfig.name} : e-mail, adresse et formulaire de contact.`,
  path: '/contact',
});

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact"
      description="Coordonnées de la rédaction et du service lecteurs."
      breadcrumbs={[{ name: 'Contact' }]}
    >
      <h2>Rédaction</h2>
      <p>
        Pour proposer une information, un sujet ou contacter un journaliste :
      </p>
      <ul>
        <li>
          E-mail rédaction :{' '}
          <a href={`mailto:${editorialConfig.redactionEmail}`}>{editorialConfig.redactionEmail}</a>
        </li>
        <li>
          E-mail général :{' '}
          <a href={`mailto:${editorialConfig.contactEmail}`}>{editorialConfig.contactEmail}</a>
        </li>
        {editorialConfig.phone && (
          <li>
            Téléphone :{' '}
            <a href={`tel:${editorialConfig.phone.replace(/\s/g, '')}`}>{editorialConfig.phone}</a>
          </li>
        )}
      </ul>

      <h2>Adresse</h2>
      <p>
        {siteConfig.name}
        <br />
        {editorialConfig.address}
        <br />
        {editorialConfig.country}
      </p>

      <h2>Service lecteurs</h2>
      <ul>
        <li>
          <a href="/#newsletter">Newsletter</a> — inscription à la lettre d&apos;information
        </li>
        <li>
          <a href="/feed.xml">Flux RSS</a> — suivi des derniers articles
        </li>
        <li>
          <a href={siteConfig.youtubeChannelUrl} target="_blank" rel="noopener noreferrer">
            Wab-infos TV sur YouTube
          </a>
        </li>
      </ul>

      <h2>Réseaux sociaux</h2>
      <ul>
        <li>
          <a href="https://facebook.com/wabinfos" target="_blank" rel="noopener noreferrer">
            Facebook — @wabinfos
          </a>
        </li>
        <li>
          <a href="https://twitter.com/wabinfos" target="_blank" rel="noopener noreferrer">
            X (Twitter) — @wabinfos
          </a>
        </li>
      </ul>

      <h2>Données personnelles</h2>
      <p>
        Pour toute demande relative à vos données (accès, rectification, suppression), consultez
        notre{' '}
        <a href="/politique-confidentialite">politique de confidentialité</a> ou écrivez à{' '}
        <a href={`mailto:${editorialConfig.contactEmail}`}>{editorialConfig.contactEmail}</a>.
      </p>
    </LegalPage>
  );
}
