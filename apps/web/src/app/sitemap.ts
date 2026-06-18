import type { MetadataRoute } from 'next';
import { categories, siteConfig } from '@/config/site';
import { getAllArticleSlugs } from '@/lib/strapi';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteConfig.url, lastModified: new Date(), changeFrequency: 'always', priority: 1 },
    { url: `${siteConfig.url}/tv`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${siteConfig.url}/recherche`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${siteConfig.url}/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'hourly' as const,
    priority: 0.9,
  }));

  let articlePages: MetadataRoute.Sitemap = [];
  try {
    const slugs = await getAllArticleSlugs();
    articlePages = slugs.map((slug) => ({
      url: `${siteConfig.url}/actualites/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {
    // Strapi not available during build
  }

  return [...staticPages, ...categoryPages, ...articlePages];
}
