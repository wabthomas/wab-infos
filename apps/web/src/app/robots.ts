import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

/**
 * Robots.txt — pensé pour le crawl News.
 *
 * On ne bloque plus `/_next/` : Googlebot doit pouvoir charger JS/CSS pour
 * rendre la page (sinon pénalité de rendu et faux « contenu vide »).
 * Seuls l’API et l’admin restent fermés.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = ['/api/', '/admin/'];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
      {
        // Crawlers News : accès complet au HTML, aux assets et aux flux.
        userAgent: ['Googlebot', 'Googlebot-News', 'Bingbot'],
        allow: '/',
        disallow,
      },
    ],
    sitemap: [
      `${siteConfig.url}/sitemap.xml`,
      `${siteConfig.url}/sitemap-news.xml`,
      `${siteConfig.url}/sitemap-videos.xml`,
    ],
    host: new URL(siteConfig.url).host,
  };
}
