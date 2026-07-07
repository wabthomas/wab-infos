import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import { editorialConfig, siteConfig } from '@/config/site';
import { generateStaticPageMetadata } from '@/lib/seo';

export const metadata: Metadata = generateStaticPageMetadata({
  title: 'Mentions légales',
  description: `Mentions légales du site ${siteConfig.name} : éditeur, hébergement et propriété intellectuelle.`,
  path: '/mentions-legales',
});

export default function LegalNoticePage() {
  return (
    <LegalPage
      title="Mentions légales"
      description="Informations légales relatives à l'édition et à l'hébergement du site."
      breadcrumbs={[{ name: 'Mentions légales' }]}
    >
      <h2>Éditeur du site</h2>
      <p>
        <strong>{siteConfig.name}</strong>
        <br />
        {editorialConfig.address}, {editorialConfig.country}
        <br />
        E-mail :{' '}
        <a href={`mailto:${editorialConfig.contactEmail}`}>{editorialConfig.contactEmail}</a>
      </p>
      <p>
        Directeur de la publication : rédaction en chef —{' '}
        <a href={`mailto:${editorialConfig.redactionEmail}`}>{editorialConfig.redactionEmail}</a>
      </p>

      <h2>Hébergement</h2>
      <p>
        Le site {siteConfig.name} est hébergé par le prestataire d&apos;hébergement du domaine{' '}
        <strong>wab-infos.com</strong>. Pour toute question technique relative à
        l&apos;hébergement, contactez{' '}
        <a href={`mailto:${editorialConfig.contactEmail}`}>{editorialConfig.contactEmail}</a>.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des contenus publiés sur {siteConfig.name} (textes, images, vidéos,
        graphismes, logos) est protégé par le droit d&apos;auteur. Toute reproduction, même
        partielle, est interdite sans autorisation écrite préalable de l&apos;éditeur, sauf
        citation courte avec lien vers la source originale.
      </p>

      <h2>Responsabilité</h2>
      <p>
        {siteConfig.name} s&apos;efforce de garantir l&apos;exactitude des informations publiées.
        Toutefois, l&apos;éditeur ne saurait être tenu responsable des omissions, inexactitudes ou
        conséquences liées à l&apos;utilisation des informations diffusées sur le site.
      </p>

      <h2>Liens hypertextes</h2>
      <p>
        Le site peut contenir des liens vers des sites tiers. {siteConfig.name} n&apos;exerce aucun
        contrôle sur ces sites et décline toute responsabilité quant à leur contenu.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="/contact">Page Contact</a> —{' '}
        <a href={`mailto:${editorialConfig.contactEmail}`}>{editorialConfig.contactEmail}</a>
      </p>
    </LegalPage>
  );
}
