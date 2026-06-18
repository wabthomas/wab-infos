import type { Article, Category } from '@wab-infos/shared';
import type { NewsArticle, WithContext, BreadcrumbList, WebSite } from 'schema-dts';
import { siteConfig, resolveArticleCategorySlug } from '@/config/site';
import { getStrapiMediaUrl } from '@/lib/utils';

export function generateArticleJsonLd(
  article: Article,
  urlCategory?: string
): WithContext<NewsArticle> {
  const imageUrl = getStrapiMediaUrl(article.featuredImage?.url) ?? siteConfig.ogImage;
  const categorySlug = resolveArticleCategorySlug(article, urlCategory);
  const articleUrl = `${siteConfig.url}/${categorySlug}/${article.slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt,
    image: [imageUrl],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: article.author
      ? {
          '@type': 'Person',
          name: article.author.name,
          url: `${siteConfig.url}/auteur/${article.author.slug}`,
        }
      : { '@type': 'Organization', name: siteConfig.publisher },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.publisher,
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.url}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.canonicalUrl || articleUrl,
    },
    articleSection: article.category?.name,
    keywords: article.tags?.map((t) => t.name).join(', '),
    wordCount: article.content.replace(/<[^>]*>/g, '').split(/\s+/).length,
    isAccessibleForFree: true,
    inLanguage: 'fr',
  };
}

export function generateBreadcrumbJsonLd(
  items: { name: string; url: string }[]
): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateWebsiteJsonLd(): WithContext<WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: 'fr',
    publisher: {
      '@type': 'Organization',
      name: siteConfig.publisher,
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.url}/logo.png`,
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteConfig.url}/recherche?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    } as WebSite['potentialAction'],
  };
}

export function generateArticleMetadata(article: Article, urlCategory?: string) {
  const imageUrl = getStrapiMediaUrl(article.featuredImage?.url) ?? siteConfig.ogImage;
  const categorySlug = resolveArticleCategorySlug(article, urlCategory);
  const url = `${siteConfig.url}/${categorySlug}/${article.slug}`;

  return {
    title: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt,
    alternates: {
      canonical: article.canonicalUrl || url,
    },
    openGraph: {
      type: 'article' as const,
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt,
      url: article.canonicalUrl || url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: article.title }],
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: article.author ? [article.author.name] : [siteConfig.publisher],
      section: article.category?.name,
      tags: article.tags?.map((t) => t.name),
    },
    twitter: {
      card: 'summary_large_image' as const,
      site: siteConfig.twitter,
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt,
      images: [imageUrl],
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large' as const,
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  };
}

export function generateCategoryMetadata(category: Category) {
  return {
    title: `${category.name} — ${siteConfig.name}`,
    description: category.description || `Toute l'actualité ${category.name} sur ${siteConfig.name}`,
    alternates: {
      canonical: `${siteConfig.url}/${category.slug}`,
    },
    openGraph: {
      title: `${category.name} — ${siteConfig.name}`,
      description: category.description,
      url: `${siteConfig.url}/${category.slug}`,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
    },
  };
}
