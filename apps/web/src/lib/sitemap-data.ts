import type { MetadataRoute } from 'next';
import { canonicalizeCategorySlug, categories, getVideoPagePath, siteConfig } from '@/config/site';
import { isProductionBuild } from '@/lib/build-phase';
import {
  getAllAuthorSlugs,
  getAllTagSlugs,
  getAllVideosForSitemap,
  getArticlePathsChunk,
  getPublishedArticleCount,
} from '@/lib/strapi';
import { getChannelRecentVideos } from '@/lib/youtube-channel';

/** ~4k URLs/chunk — well under Google’s 50k/50MB limits, keeps each response fast. */
export const ARTICLES_PER_SITEMAP = 4000;

export const SITEMAP_RESPONSE_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=1800, s-maxage=3600',
} as const;

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeIsoDate(value: string | Date | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function toSitemapXml(entries: MetadataRoute.Sitemap): string {
  const urls = entries
    .map((entry) => {
      const lastmodValue = safeIsoDate(
        entry.lastModified instanceof Date
          ? entry.lastModified
          : entry.lastModified
            ? new Date(entry.lastModified)
            : undefined
      );
      const lastmod = lastmodValue ? `<lastmod>${lastmodValue}</lastmod>` : '';
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

export function toSitemapIndexXml(sitemapUrls: string[]): string {
  const now = new Date().toISOString();
  const body = sitemapUrls
    .map(
      (loc) => `  <sitemap>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`;
}

function staticAndCategoryEntries(): MetadataRoute.Sitemap {
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

  return [...staticPages, ...categoryPages];
}

async function videoAuthorTagEntries(): Promise<MetadataRoute.Sitemap> {
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

  return [...videoPages, ...authorPages, ...tagPages];
}

export async function getArticleSitemapChunkCount(): Promise<number> {
  if (isProductionBuild()) return 0;
  try {
    const total = await getPublishedArticleCount();
    if (total <= 0) return 0;
    return Math.ceil(total / ARTICLES_PER_SITEMAP);
  } catch {
    return 0;
  }
}

/** Index léger — toujours rapide pour Googlebot / CDN. */
export async function buildSitemapIndexXml(): Promise<string> {
  const chunkCount = await getArticleSitemapChunkCount();
  const urls = [
    `${siteConfig.url}/sitemaps/static.xml`,
    ...Array.from({ length: chunkCount }, (_, i) => `${siteConfig.url}/sitemaps/articles/${i}`),
  ];
  return toSitemapIndexXml(urls);
}

export async function buildStaticSitemapXml(): Promise<string> {
  if (isProductionBuild()) {
    return toSitemapXml(staticAndCategoryEntries());
  }
  const extras = await videoAuthorTagEntries();
  return toSitemapXml([...staticAndCategoryEntries(), ...extras]);
}

export async function buildArticlesSitemapXml(chunkIndex: number): Promise<string> {
  if (isProductionBuild() || chunkIndex < 0) {
    return toSitemapXml([]);
  }

  try {
    const paths = await getArticlePathsChunk(chunkIndex, ARTICLES_PER_SITEMAP);
    const entries: MetadataRoute.Sitemap = paths.map(({ slug, categorySlug, updatedAt }) => ({
      url: `${siteConfig.url}/${canonicalizeCategorySlug(categorySlug)}/${slug}`,
      lastModified: new Date(updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
    return toSitemapXml(entries);
  } catch {
    return toSitemapXml([]);
  }
}

/** @deprecated Prefer sitemap index + chunks. Kept for local tooling. */
export async function buildMainSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = staticAndCategoryEntries();
  if (isProductionBuild()) return staticEntries;

  const [chunkCount, extras] = await Promise.all([
    getArticleSitemapChunkCount(),
    videoAuthorTagEntries(),
  ]);

  const articlePages: MetadataRoute.Sitemap = [];
  for (let i = 0; i < chunkCount; i++) {
    const paths = await getArticlePathsChunk(i, ARTICLES_PER_SITEMAP);
    for (const { slug, categorySlug, updatedAt } of paths) {
      articlePages.push({
        url: `${siteConfig.url}/${canonicalizeCategorySlug(categorySlug)}/${slug}`,
        lastModified: new Date(updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      });
    }
  }

  return [...staticEntries, ...articlePages, ...extras];
}

export async function buildMainSitemapXml(): Promise<string> {
  return buildSitemapIndexXml();
}
