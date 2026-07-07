import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import { editorialConfig, siteConfig } from '@/config/site';
import { generateStaticPageMetadata } from '@/lib/seo';

export const metadata: Metadata = generateStaticPageMetadata({
  title: 'Politique de confidentialité',
  description: `Comment ${siteConfig.name} collecte, utilise et protège vos données personnelles.`,
  path: '/politique-confidentialite',
});

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      description="Vos droits et la gestion de vos données sur Wab-infos."
      breadcrumbs={[{ name: 'Confidentialité' }]}
    >
      <h2>Responsable du traitement</h2>
      <p>
        <strong>{siteConfig.name}</strong> —{' '}
        <a href={`mailto:${editorialConfig.contactEmail}`}>{editorialConfig.contactEmail}</a>
        <br />
        {editorialConfig.address}, {editorialConfig.country}
      </p>

      <h2>Données collectées</h2>
      <p>Nous pouvons collecter les données suivantes :</p>
      <ul>
        <li>
          <strong>Newsletter</strong> : adresse e-mail lors de l&apos;inscription volontaire
        </li>
        <li>
          <strong>Commentaires</strong> : nom, e-mail et contenu du message (modération avant
          publication)
        </li>
        <li>
          <strong>Alertes push</strong> : abonnement navigateur (endpoint technique, sans nom ni
          e-mail)
        </li>
        <li>
          <strong>Analytics</strong> : données de navigation anonymisées via Google Analytics (si
          activé)
        </li>
        <li>
          <strong>Cookies publicitaires</strong> : Google AdSense (si activé), soumis à votre
          consentement selon la réglementation applicable
        </li>
      </ul>

      <h2>Finalités</h2>
      <ul>
        <li>Envoi de la newsletter et des alertes aux abonnés</li>
        <li>Modération et publication des commentaires</li>
        <li>Mesure d&apos;audience et amélioration du site</li>
        <li>Affichage de publicités pertinentes</li>
      </ul>

      <h2>Conservation</h2>
      <p>
        Les données newsletter sont conservées jusqu&apos;à désinscription. Les abonnements push
        sont supprimés lors de la désinstallation ou expiration de l&apos;abonnement navigateur.
        Les logs analytics sont conservés selon la durée définie par Google.
      </p>

      <h2>Vos droits</h2>
      <p>
        Conformément à la réglementation applicable, vous disposez d&apos;un droit d&apos;accès, de
        rectification, de suppression et d&apos;opposition. Pour exercer ces droits, contactez :{' '}
        <a href={`mailto:${editorialConfig.contactEmail}`}>{editorialConfig.contactEmail}</a>.
      </p>
      <ul>
        <li>
          Désinscription newsletter :{' '}
          <a href="/newsletter/desinscription">page de désinscription</a>
        </li>
        <li>
          Alertes push : désactivation dans les paramètres de votre navigateur
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Le site utilise des cookies techniques nécessaires au fonctionnement (thème, session
        rédaction). Les cookies analytics et publicitaires ne sont déposés que si les services
        correspondants sont activés (Google Analytics, AdSense).
      </p>

      <h2>Transferts et sous-traitants</h2>
      <p>
        Certaines données peuvent être traitées par des prestataires (hébergement, Brevo pour
        l&apos;e-mail, Google pour analytics/publicité). Ces prestataires sont sélectionnés pour
        leur conformité aux standards de sécurité.
      </p>

      <h2>Modifications</h2>
      <p>
        Cette politique peut être mise à jour. La date de dernière modification figure en bas de
        page.
      </p>
    </LegalPage>
  );
}
