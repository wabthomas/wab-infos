import type { MetadataRoute } from 'next';
import { categories, getVideoPagePath, siteConfig } from '@/config/site';
import { isProductionBuild } from '@/lib/build-phase';
import {
  getAllArticlePaths,
  getAllAuthorSlugs,
  getAllTagSlugs,
  getAllVideosForSitemap,
} from '@/lib/strapi';
import { getChannelRecentVideos } from '@/lib/youtube-channel';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toSitemapXml(entries: MetadataRoute.Sitemap): string {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastModified
        ? `<lastmod>${new Date(entry.lastModified).toISOString()}</lastmod>`
        : '';
      const changefreq = entry.changeFrequency
        ? `<changefreq>${entry.changeFrequency}</changefreq>`
        : '';
      const priority =
        entry.priority !== undefined ? `<priority>${entry.priority}</priority>` : '';

      return `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    ${lastmod}
    ${changefreq}
    ${priority}
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

/** Entrées du sitemap principal (articles exclus pendant `next build` pour éviter l'OOM). */
export async function buildMainSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteConfig.url, lastModified: new Date(), changeFrequency: 'always', priority: 1 },
    { url: `${siteConfig.url}/tv`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${siteConfig.url}/a-propos`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteConfig.url}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteConfig.url}/mentions-legales`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    {
      url: `${siteConfig.url}/politique-confidentialite`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${siteConfig.url}/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'hourly' as const,
    priority: 0.9,
  }));

  if (isProductionBuild()) {
    return [...staticPages, ...categoryPages];
  }

  let articlePages: MetadataRoute.Sitemap = [];
  try {
    const paths = await getAllArticlePaths();
    articlePages = paths.map(({ slug, categorySlug, updatedAt }) => ({
      url: `${siteConfig.url}/${categorySlug}/${slug}`,
      lastModified: new Date(updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {
    // Strapi indisponible
  }

  let videoPages: MetadataRoute.Sitemap = [];
  const seenVideoIds = new Set<string>();

  try {
    const strapiVideos = await getAllVideosForSitemap();
    for (const video of strapiVideos) {
      if (!video.youtubeId || seenVideoIds.has(video.youtubeId)) continue;
      seenVideoIds.add(video.youtubeId);
      videoPages.push({
        url: `${siteConfig.url}${getVideoPagePath(video.youtubeId)}`,
        lastModified: new Date(video.publishedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      });
    }
  } catch {
    // Strapi indisponible
  }

  try {
    const channelId = siteConfig.youtubeChannelId;
    if (channelId) {
      const recent = await getChannelRecentVideos(channelId, 50);
      for (const entry of recent) {
        if (seenVideoIds.has(entry.videoId)) continue;
        seenVideoIds.add(entry.videoId);
        videoPages.push({
          url: `${siteConfig.url}${getVideoPagePath(entry.videoId)}`,
          lastModified: new Date(entry.publishedAt),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        });
      }
    }
  } catch {
    // YouTube indisponible
  }

  let authorPages: MetadataRoute.Sitemap = [];
  let tagPages: MetadataRoute.Sitemap = [];
  try {
    const [authorSlugs, tagSlugs] = await Promise.all([getAllAuthorSlugs(), getAllTagSlugs()]);
    authorPages = authorSlugs.map((slug) => ({
      url: `${siteConfig.url}/auteur/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));
    tagPages = tagSlugs.map((slug) => ({
      url: `${siteConfig.url}/tag/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    }));
  } catch {
    // Strapi indisponible
  }

  return [...staticPages, ...categoryPages, ...articlePages, ...videoPages, ...authorPages, ...tagPages];
}

export async function buildMainSitemapXml(): Promise<string> {
  const entries = await buildMainSitemapEntries();
  return toSitemapXml(entries);
}
