import type { Article, Category, Video } from '@wab-infos/shared';
import type {
  NewsArticle,
  WithContext,
  BreadcrumbList,
  WebSite,
  VideoObject,
  BroadcastEvent,
} from 'schema-dts';
import {
  getArticlePath,
  getVideoPagePath,
  resolveArticleCategorySlug,
  siteConfig,
} from '@/config/site';
import { getArticleDisplayDate, getStrapiMediaUrl } from '@/lib/utils';
import { isValidVideoPublishedAt } from '@/lib/youtube-channel';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function collectArticleImages(article: Article): string[] {
  const urls = new Set<string>();
  const featured = article.featuredImage;

  const add = (url?: string) => {
    const resolved = getStrapiMediaUrl(url);
    if (resolved) urls.add(resolved);
  };

  add(featured?.url);
  add(featured?.formats?.large?.url);
  add(featured?.formats?.medium?.url);
  add(featured?.formats?.small?.url);

  if (urls.size === 0) urls.add(siteConfig.ogImage);

  return [...urls];
}

function getFeaturedImageAlt(article: Article): string {
  return article.featuredImage?.alternativeText || article.title;
}

export function getYoutubeThumbnailUrl(youtubeId: string, quality: 'maxres' | 'hq' = 'maxres'): string {
  const file = quality === 'maxres' ? 'maxresdefault.jpg' : 'hqdefault.jpg';
  return `https://i.ytimg.com/vi/${youtubeId}/${file}`;
}

export function generateArticleJsonLd(
  article: Article,
  urlCategory?: string
): WithContext<NewsArticle> {
  const images = collectArticleImages(article);
  const categorySlug = resolveArticleCategorySlug(article, urlCategory);
  const articleUrl = `${siteConfig.url}${getArticlePath(article, urlCategory)}`;
  const plainBody = stripHtml(article.content);

  const displayDate = getArticleDisplayDate(article);

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt,
    image: images,
    datePublished: displayDate,
    dateModified: article.updatedAt || displayDate,
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
    wordCount: plainBody.split(/\s+/).filter(Boolean).length,
    articleBody: plainBody.slice(0, 5000),
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

export function generateVideoJsonLd(video: Video): WithContext<VideoObject> {
  const pageUrl = `${siteConfig.url}${getVideoPagePath(video.youtubeId)}`;
  const thumbnail =
    getStrapiMediaUrl(video.thumbnail?.url) ?? getYoutubeThumbnailUrl(video.youtubeId);

  const jsonLd: WithContext<VideoObject> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description: video.description || `${video.title} — Wab-infos TV`,
    thumbnailUrl: [thumbnail, getYoutubeThumbnailUrl(video.youtubeId, 'hq')],
    ...(isValidVideoPublishedAt(video.publishedAt) ? { uploadDate: video.publishedAt } : {}),
    contentUrl: `https://www.youtube.com/watch?v=${video.youtubeId}`,
    embedUrl: `https://www.youtube.com/embed/${video.youtubeId}`,
    mainEntityOfPage: pageUrl,
    inLanguage: 'fr',
    isFamilyFriendly: true,
    publisher: {
      '@type': 'Organization',
      name: siteConfig.publisher,
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.url}/logo.png`,
      },
    },
  };

  if (video.duration) {
    jsonLd.duration = video.duration;
  }

  return jsonLd;
}

export function generateBroadcastEventJsonLd(options: {
  videoId: string;
  title: string;
  publishedAt?: string;
  isLive: boolean;
}): WithContext<BroadcastEvent> {
  const pageUrl = `${siteConfig.url}${getVideoPagePath(options.videoId)}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'BroadcastEvent',
    name: options.title,
    isLiveBroadcast: options.isLive,
    startDate: options.publishedAt,
    broadcastOfEvent: {
      '@type': 'Event',
      name: options.title,
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      eventStatus: options.isLive
        ? 'https://schema.org/EventScheduled'
        : 'https://schema.org/EventPostponed',
      location: {
        '@type': 'VirtualLocation',
        url: pageUrl,
      },
    },
    videoFormat: 'HD',
    publishedOn: {
      '@type': 'BroadcastService',
      name: 'Wab-infos TV',
      broadcastDisplayName: siteConfig.name,
      url: `${siteConfig.url}/tv`,
    },
  };
}

export function generateArticleMetadata(article: Article, urlCategory?: string) {
  const images = collectArticleImages(article);
  const imageUrl = images[0];
  const imageAlt = getFeaturedImageAlt(article);
  const url = `${siteConfig.url}${getArticlePath(article, urlCategory)}`;
  const displayDate = getArticleDisplayDate(article);

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
      images: images.map((img) => ({
        url: img,
        width: 1200,
        height: 630,
        alt: imageAlt,
      })),
      publishedTime: displayDate,
      modifiedTime: article.updatedAt || displayDate,
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
  const title = `${category.name} — ${siteConfig.name}`;
  const description =
    category.description || `Toute l'actualité ${category.name} sur ${siteConfig.name}`;
  const url = `${siteConfig.url}/${category.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website' as const,
      title,
      description,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      site: siteConfig.twitter,
      title,
      description,
      images: [siteConfig.ogImage],
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large' as const,
      'max-snippet': -1,
    },
  };
}

export function generateAuthorMetadata(author: { name: string; slug: string; bio?: string }) {
  const title = author.name;
  const description = author.bio ?? `Articles de ${author.name} sur ${siteConfig.name}`;
  const url = `${siteConfig.url}/auteur/${author.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'profile' as const,
      title: `${title} — ${siteConfig.name}`,
      description,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      site: siteConfig.twitter,
      title: `${title} — ${siteConfig.name}`,
      description,
      images: [siteConfig.ogImage],
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large' as const,
    },
  };
}

export function generateStaticPageMetadata(options: {
  title: string;
  description: string;
  path: string;
}) {
  const url = `${siteConfig.url}${options.path}`;

  return {
    title: options.title,
    description: options.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website' as const,
      title: `${options.title} — ${siteConfig.name}`,
      description: options.description,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: options.title }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      site: siteConfig.twitter,
      title: `${options.title} — ${siteConfig.name}`,
      description: options.description,
      images: [siteConfig.ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function generateHomeMetadata() {
  return {
    title: `${siteConfig.name} — Actualités RDC et International`,
    description: siteConfig.description,
    alternates: { canonical: siteConfig.url },
    openGraph: {
      type: 'website' as const,
      title: `${siteConfig.name} — Actualités RDC et International`,
      description: siteConfig.description,
      url: siteConfig.url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      site: siteConfig.twitter,
      title: `${siteConfig.name} — Actualités RDC et International`,
      description: siteConfig.description,
      images: [siteConfig.ogImage],
    },
  };
}

export function generateVideoMetadata(video: Video) {
  const pageUrl = `${siteConfig.url}${getVideoPagePath(video.youtubeId)}`;
  const thumbnail =
    getStrapiMediaUrl(video.thumbnail?.url) ?? getYoutubeThumbnailUrl(video.youtubeId);
  const description = video.description || `${video.title} — Wab-infos TV`;

  return {
    title: `${video.title} — Wab-infos TV`,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      type: 'video.other' as const,
      title: video.title,
      description,
      url: pageUrl,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: [{ url: thumbnail, width: 1280, height: 720, alt: video.title }],
      videos: [
        {
          url: `https://www.youtube.com/embed/${video.youtubeId}`,
          secureUrl: `https://www.youtube.com/embed/${video.youtubeId}`,
          type: 'text/html',
          width: 1280,
          height: 720,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image' as const,
      site: siteConfig.twitter,
      title: video.title,
      description,
      images: [thumbnail],
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

export function generateTvPageMetadata() {
  return {
    title: 'Wab-infos TV — Direct, replays & émissions',
    description:
      'Suivez Wab-infos TV en direct, retrouvez les replays, émissions et podcasts de la chaîne YouTube @wabinfostv.',
    alternates: {
      canonical: `${siteConfig.url}/tv`,
    },
    openGraph: {
      type: 'website' as const,
      title: 'Wab-infos TV',
      description: 'Direct, replays, émissions et podcasts — Wab-infos TV',
      url: `${siteConfig.url}/tv`,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
    },
    twitter: {
      card: 'summary_large_image' as const,
      site: siteConfig.twitter,
      title: 'Wab-infos TV',
      description: 'Direct, replays, émissions et podcasts',
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large' as const,
      'max-video-preview': -1,
    },
  };
}
