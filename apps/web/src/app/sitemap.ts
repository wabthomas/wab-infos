import type { MetadataRoute } from 'next';
import { categories, getVideoPagePath, siteConfig } from '@/config/site';
import { isProductionBuild } from '@/lib/build-phase';
import { getAllArticlePaths, getAllVideosForSitemap } from '@/lib/strapi';
import { getChannelRecentVideos } from '@/lib/youtube-channel';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  // Pendant `next build` : ne pas charger des milliers d'articles en mémoire (OOM mutualisé)
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
    // Strapi not available during build
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
    // Strapi not available
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
    // YouTube feed unavailable
  }

  return [...staticPages, ...categoryPages, ...articlePages, ...videoPages];
}
