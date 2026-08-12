import {
  absolutizeUrl,
  decodeHtmlEntities,
  excerptFromHtml,
  extractMetaContent,
  firstImageFromHtml,
  sanitizeArticleHtml,
  stripTags,
} from '../html';
import { guessCategorySlug } from '../map-category';
import { discoverFromRssList, fetchText } from '../discover';
import type { DiscoveredItem, NewsSourceConfig, NewsSourceId, ParsedArticle } from '../types';
import { parseActualiteCdArticle } from './actualite-cd';
import { parseRadioOkapiArticle } from './radio-okapi';

export const NEWS_SOURCES: NewsSourceConfig[] = [
  {
    id: 'radio-okapi',
    name: 'Radio Okapi',
    homeUrl: 'https://www.radiookapi.net/',
    rssUrls: ['https://www.radiookapi.net/feed'],
    enabled: true,
  },
  {
    id: 'actualite-cd',
    name: 'Actualite.cd',
    homeUrl: 'https://actualite.cd/',
    rssUrls: ['https://actualite.cd/feed', 'https://actualite.cd/rss.xml'],
    enabled: true,
  },
  {
    id: '7sur7',
    name: '7sur7.cd',
    homeUrl: 'https://www.7sur7.cd/',
    rssUrls: ['https://www.7sur7.cd/rss.xml', 'https://7sur7.cd/feed'],
    enabled: true,
  },
  {
    id: 'le-potentiel',
    name: 'Le Potentiel',
    homeUrl: 'https://lepotentiel.cd/',
    rssUrls: ['https://lepotentiel.cd/feed/', 'https://lepotentiel.cd/feed'],
    enabled: true,
  },
  {
    id: 'opinion-info',
    name: 'Opinion-Info',
    homeUrl: 'https://www.opinion-info.cd/',
    rssUrls: ['https://www.opinion-info.cd/rss.xml', 'https://opinion-info.cd/feed'],
    enabled: true,
  },
];

function genericBodyFromHtml(pageHtml: string): string {
  const candidates = [
    /property=["']content:encoded["'][^>]*>([\s\S]*?)<\/div>/i,
    /class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /class=["'][^"']*post-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
  ];
  for (const re of candidates) {
    const m = re.exec(pageHtml);
    if (m?.[1] && stripTags(m[1]).length > 120) return sanitizeArticleHtml(m[1]);
  }
  const paras = pageHtml.match(/<p[\s>][\s\S]*?<\/p>/gi);
  if (paras && paras.length >= 2) return sanitizeArticleHtml(paras.slice(0, 20).join('\n'));
  return '';
}

async function parseGenericArticle(
  item: DiscoveredItem,
  source: NewsSourceConfig
): Promise<ParsedArticle> {
  const html = await fetchText(item.url);
  const title =
    item.title?.trim() ||
    decodeHtmlEntities(extractMetaContent(html, 'og:title') || '') ||
    stripTags(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] || '');
  const body = genericBodyFromHtml(html);
  if (!title || stripTags(body).length < 80) {
    throw new Error(`Parse générique insuffisant pour ${item.url}`);
  }
  const ogImage = extractMetaContent(html, 'og:image');
  const fromBody = firstImageFromHtml(body);
  const imageUrl = ogImage
    ? absolutizeUrl(ogImage, item.url)
    : fromBody.src
      ? absolutizeUrl(fromBody.src, item.url)
      : undefined;

  return {
    title: title.trim(),
    html: body,
    excerpt: excerptFromHtml(body),
    imageUrl,
    imageAlt: fromBody.alt,
    sourceName: source.name,
    sourceUrl: item.url,
    sourceId: source.id,
    publishedAt: item.publishedAt,
    categoryGuess: guessCategorySlug({
      sourceId: source.id,
      url: item.url,
      title,
      categoryHint: item.categoryHint,
    }),
  };
}

export async function discoverSourceItems(source: NewsSourceConfig): Promise<DiscoveredItem[]> {
  const limit = Number(process.env.NEWS_INGEST_RSS_LIMIT || 24);
  return discoverFromRssList(source.rssUrls, Number.isFinite(limit) && limit > 0 ? limit : 24);
}

export async function parseSourceArticle(
  source: NewsSourceConfig,
  item: DiscoveredItem
): Promise<ParsedArticle> {
  switch (source.id as NewsSourceId) {
    case 'radio-okapi':
      return parseRadioOkapiArticle(item);
    case 'actualite-cd':
      return parseActualiteCdArticle(item);
    default:
      return parseGenericArticle(item, source);
  }
}
