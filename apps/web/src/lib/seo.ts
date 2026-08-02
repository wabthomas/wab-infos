import type { Article, Category, Video } from '@wab-infos/shared';
import type {
  NewsArticle,
  WithContext,
  BreadcrumbList,
  WebSite,
  VideoObject,
  BroadcastEvent,
  NewsMediaOrganization,
  Person,
} from 'schema-dts';
import {
  editorialConfig,
  getArticlePath,
  getVideoPagePath,
  resolveArticleCategorySlug,
  siteConfig,
  siteSocialProfiles,
} from '@/config/site';
import { resolveArticleOgImage } from '@/lib/og-image-url';
import { getArticleDisplayDate, getStrapiMediaUrl } from '@/lib/utils';
import { isValidVideoPublishedAt } from '@/lib/youtube-channel';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function collectArticleImages(article: Article): string[] {
  const { url } = resolveArticleOgImage(article);
  return [url];
}

function publisherLogoObject() {
  return {
    '@type': 'ImageObject' as const,
    url: siteConfig.publisherLogoUrl,
    width: '400',
    height: '200',
  };
}

function resolveCanonicalUrl(article: Article, defaultUrl: string): string {
  const raw = article.canonicalUrl?.trim();
  if (!raw) return defaultUrl;

  try {
    const site = new URL(siteConfig.url);
    const candidate = raw.startsWith('http://') || raw.startsWith('https://')
      ? new URL(raw)
      : new URL(raw.startsWith('/') ? raw : `/${raw}`, site.origin);

    const host = candidate.hostname.replace(/^www\./, '');
    const siteHost = site.hostname.replace(/^www\./, '');
    if (host !== siteHost) {
      // Ignore les canonicals WP / domaines externes (ex. app.wab-infos.com).
      return defaultUrl;
    }

    // Canonical vers l’accueil ou une URL trop courte = donnée d’import invalide.
    const path = candidate.pathname.replace(/\/$/, '') || '/';
    if (path === '/' || path.split('/').filter(Boolean).length < 2) {
      return defaultUrl;
    }

    candidate.hash = '';
    return candidate.toString().replace(/\/$/, '');
  } catch {
    return defaultUrl;
  }
}

export function generateOrganizationJsonLd(): WithContext<NewsMediaOrganization> {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: siteConfig.publisher,
    alternateName: ['Wab-infos', 'Wab infos', 'wab-infos'],
    url: siteConfig.url,
    logo: publisherLogoObject(),
    description: siteConfig.description,
    foundingDate: `${editorialConfig.foundedYear}-01-01`,
    areaServed: {
      '@type': 'Country',
      name: editorialConfig.country,
    },
    sameAs: [...siteSocialProfiles],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: editorialConfig.contactEmail,
      availableLanguage: ['fr'],
    },
  };
}

export function generatePersonJsonLd(author: {
  name: string;
  slug: string;
  bio?: string;
  role?: string;
}): WithContext<Person> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    url: `${siteConfig.url}/auteur/${author.slug}`,
    description: author.bio,
    jobTitle: author.role,
    worksFor: {
      '@type': 'NewsMediaOrganization',
      name: siteConfig.publisher,
      url: siteConfig.url,
    },
  };
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
  const ogImage = resolveArticleOgImage(article);

  const displayDate = getArticleDisplayDate(article);
  const imageObjects = images.map((url) => ({
    '@type': 'ImageObject' as const,
    url,
    ...(ogImage.width && ogImage.height
      ? { width: String(ogImage.width), height: String(ogImage.height) }
      : { width: '1200', height: '630' }),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.seoDescription || article.excerpt,
    image: imageObjects,
    url: articleUrl,
    datePublished: displayDate,
    dateModified: article.updatedAt || displayDate,
    author: article.author
      ? {
          '@type': 'Person',
          name: article.author.name,
          url: `${siteConfig.url}/auteur/${article.author.slug}`,
        }
      : { '@type': 'NewsMediaOrganization', name: siteConfig.publisher },
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: siteConfig.publisher,
      logo: publisherLogoObject(),
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['article h1', 'header h1'],
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
      '@type': 'NewsMediaOrganization',
      name: siteConfig.publisher,
      logo: publisherLogoObject(),
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
      '@type': 'NewsMediaOrganization',
      name: siteConfig.publisher,
      logo: publisherLogoObject(),
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
  const ogImage = resolveArticleOgImage(article);
  const url = `${siteConfig.url}${getArticlePath(article, urlCategory)}`;
  const canonical = resolveCanonicalUrl(article, url);
  const displayDate = getArticleDisplayDate(article);

  const imageMeta = {
    url: ogImage.url,
    alt: ogImage.alt,
    ...(ogImage.type ? { type: ogImage.type } : {}),
    ...(ogImage.width && ogImage.height
      ? { width: ogImage.width, height: ogImage.height }
      : { width: 1200, height: 630 }),
  };

  return {
    title: {
      absolute: article.seoTitle || article.title,
    },
    description: article.seoDescription || article.excerpt,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'article' as const,
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt,
      url: canonical,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: [imageMeta],
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
      images: [ogImage.url],
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

export function generateCategoryMetadata(
  category: Category,
  options?: { indexable?: boolean }
) {
  const title = `${category.name} — ${siteConfig.name}`;
  const rdcBoost =
    category.slug === 'actualites-rdc' || category.slug === 'actualite'
      ? ' — dernières nouvelles du Congo et de Kinshasa'
      : '';
  const description =
    category.description ||
    `Toute l'actualité ${category.name} en RDC et à l'international sur ${siteConfig.name}${rdcBoost}.`;
  const url = `${siteConfig.url}/${category.slug}`;
  const indexable = options?.indexable !== false;

  return {
    title: { absolute: title },
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
      index: indexable,
      follow: true,
      'max-image-preview': 'large' as const,
      'max-snippet': -1,
    },
  };
}

export function generateTagMetadata(
  tag: { name: string; slug: string },
  options?: { indexable?: boolean }
) {
  const title = `${tag.name} — actualités`;
  const description = `Articles et actualités sur « ${tag.name} » publiés par ${siteConfig.name}, média d'information en RDC.`;
  const url = `${siteConfig.url}/tag/${tag.slug}`;
  const indexable = options?.indexable !== false;

  return {
    title: { absolute: `${title} — ${siteConfig.name}` },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website' as const,
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
      index: indexable,
      follow: true,
      'max-image-preview': 'large' as const,
    },
  };
}

export function generateAuthorMetadata(
  author: { name: string; slug: string; bio?: string },
  options?: { indexable?: boolean }
) {
  const title = author.name;
  const description = author.bio ?? `Articles de ${author.name} sur ${siteConfig.name}`;
  const url = `${siteConfig.url}/auteur/${author.slug}`;
  const indexable = options?.indexable !== false;

  return {
    title: { absolute: `${title} — ${siteConfig.name}` },
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
      index: indexable,
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
    title: { absolute: options.title.includes(siteConfig.name) ? options.title : `${options.title} — ${siteConfig.name}` },
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
  const title = `${siteConfig.name} — Actualités RDC et International`;
  return {
    title: { absolute: title },
    description: siteConfig.description,
    alternates: {
      canonical: siteConfig.url,
      languages: {
        'fr-FR': siteConfig.url,
        'fr-CD': siteConfig.url,
        fr: siteConfig.url,
        'x-default': siteConfig.url,
      },
    },
    openGraph: {
      type: 'website' as const,
      title,
      description: siteConfig.description,
      url: siteConfig.url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      site: siteConfig.twitter,
      title,
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
    title: { absolute: `${video.title} — Wab-infos TV` },
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
