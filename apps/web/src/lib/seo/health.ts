import type { SeoIndexingHealth } from '@wab-infos/shared';
import { siteConfig } from '@/config/site';
import { isCloudflarePurgeConfigured } from '@/lib/cache/cloudflare';
import { isGoogleIndexingConfigured } from '@/lib/google-indexing';

/**
 * État de la chaîne d’indexation (sans appel réseau).
 * Affiché dans la rédaction pour repérer tout de suite un maillon manquant.
 */
export function getIndexingHealth(): SeoIndexingHealth {
  return {
    indexNowConfigured: Boolean(process.env.INDEXNOW_KEY?.trim()),
    googleIndexingConfigured: isGoogleIndexingConfigured(),
    cloudflarePurgeConfigured: isCloudflarePurgeConfigured(),
    newsPublication: siteConfig.googleNewsPublication,
    newsSitemapUrl: `${siteConfig.url}/sitemap-news.xml`,
    sitemapUrl: `${siteConfig.url}/sitemap.xml`,
    videosSitemapUrl: `${siteConfig.url}/sitemap-videos.xml`,
    feedUrl: `${siteConfig.url}/feed.xml`,
  };
}
