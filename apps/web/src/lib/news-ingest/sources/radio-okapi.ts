import {
  absolutizeUrl,
  decodeHtmlEntities,
  excerptFromHtml,
  extractBetween,
  extractMetaContent,
  firstImageFromHtml,
  removeFirstImage,
  sanitizeArticleHtml,
  stripTags,
} from '../html';
import { guessCategorySlug } from '../map-category';
import { fetchText } from '../discover';
import type { DiscoveredItem, ParsedArticle } from '../types';

const SOURCE_NAME = 'Radio Okapi';
const SOURCE_ID = 'radio-okapi' as const;

export async function parseRadioOkapiArticle(item: DiscoveredItem): Promise<ParsedArticle> {
  const html = await fetchText(item.url);
  const title =
    item.title?.trim() ||
    decodeHtmlEntities(extractMetaContent(html, 'og:title') || '') ||
    stripTags(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] || '');

  let body =
    extractBetween(
      html,
      /property=["']content:encoded["'][^>]*>/i,
      /<\/div>\s*<\/div>\s*<\/div>\s*(?:<div class="field field-name-field-article-similaire|<div class="field field-name-field-)/i
    ) ||
    extractBetween(
      html,
      /class=["']field-item even["'][^>]*property=["']content:encoded["'][^>]*>/i,
      /<\/div>/i
    ) ||
    '';

  body = sanitizeArticleHtml(body);
  if (!body || stripTags(body).length < 80) {
    throw new Error(`Corps trop court pour ${item.url}`);
  }

  const ogImage = extractMetaContent(html, 'og:image');
  const fromBody = firstImageFromHtml(body);
  const imageUrl = ogImage || (fromBody.src ? absolutizeUrl(fromBody.src, item.url) : undefined);
  let imageAlt = fromBody.title || fromBody.alt;
  const titleAttr = /title=["']([^"']+)["']/i.exec(body);
  if (!imageAlt && titleAttr?.[1]) {
    imageAlt = decodeHtmlEntities(titleAttr[1].replace(/<br\s*\/?>/gi, ' '));
  }

  // L’image à la une est souvent dans le corps Okapi — on la retire du HTML.
  const cleaned = removeFirstImage(body);

  const categoryGuess = guessCategorySlug({
    sourceId: SOURCE_ID,
    url: item.url,
    title,
    categoryHint: item.categoryHint,
  });

  return {
    title: title.trim(),
    html: cleaned,
    excerpt: excerptFromHtml(cleaned),
    imageUrl,
    imageAlt: imageAlt?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200),
    sourceName: SOURCE_NAME,
    sourceUrl: item.url,
    sourceId: SOURCE_ID,
    publishedAt: item.publishedAt,
    categoryGuess,
  };
}
