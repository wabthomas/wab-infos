import {
  absolutizeUrl,
  decodeHtmlEntities,
  excerptFromHtml,
  extractBetween,
  extractMetaContent,
  firstImageFromHtml,
  sanitizeArticleHtml,
  stripTags,
} from '../html';
import { guessCategorySlug } from '../map-category';
import { fetchText } from '../discover';
import type { DiscoveredItem, ParsedArticle } from '../types';

const SOURCE_NAME = 'Actualite.cd';
const SOURCE_ID = 'actualite-cd' as const;

export async function parseActualiteCdArticle(item: DiscoveredItem): Promise<ParsedArticle> {
  const html = await fetchText(item.url);
  const title =
    item.title?.trim() ||
    decodeHtmlEntities(extractMetaContent(html, 'og:title') || '') ||
    stripTags(/property=["']schema:name["'][^>]*>([\s\S]*?)<\/span>/i.exec(html)?.[1] || '') ||
    stripTags(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] || '');

  let body =
    extractBetween(html, /id=["']block-actualite2026-corps["'][\s\S]*?<div>/i, /<\/div>\s*<\/div>/i) ||
    extractBetween(html, /<div><p class=["']text-align-justify["']>/i, /<\/div>\s*<\/div>/i) ||
    '';

  // Si on a capturé seulement le début via le 2e motif, préfixer le <p>
  if (body && !body.trimStart().startsWith('<')) {
    body = `<p class="text-align-justify">${body}`;
  }
  if (body && !/^[\s\S]*<p/i.test(body) && body.includes('text-align-justify')) {
    body = `<div>${body}</div>`;
  }

  // Repli : premier bloc de paragraphes justifiés
  if (!body || stripTags(body).length < 80) {
    const paras = html.match(/<p class=["']text-align-justify["']>[\s\S]*?<\/p>/gi);
    if (paras?.length) body = paras.join('\n');
  }

  body = sanitizeArticleHtml(body);
  if (!body || stripTags(body).length < 80) {
    throw new Error(`Corps trop court pour ${item.url}`);
  }

  const ogImage = extractMetaContent(html, 'og:image');
  const fromBody = firstImageFromHtml(body);
  const imageUrlRaw =
    ogImage ||
    /id=["']block-actualite2026-imagemedia["'][\s\S]*?<img[^>]+src=["']([^"']+)["']/i.exec(html)?.[1] ||
    fromBody.src;
  const imageUrl = imageUrlRaw ? absolutizeUrl(imageUrlRaw, item.url) : undefined;
  const imageBlock =
    /id=["']block-actualite2026-imagemedia["'][\s\S]{0,1200}?<img[^>]*>/i.exec(html)?.[0] || '';
  const imageAltRaw =
    /alt=["']([^"']+)["']/i.exec(imageBlock)?.[1] ||
    (fromBody.alt && !/outdated browser/i.test(fromBody.alt) ? fromBody.alt : undefined);
  const imageAlt = imageAltRaw
    ? decodeHtmlEntities(imageAltRaw).slice(0, 200)
    : undefined;

  const categoryFromPage =
    /id=["']block-actualite2026-categorie["'][\s\S]*?<a[^>]*>([^<]+)<\/a>/i.exec(html)?.[1] ||
    item.categoryHint;

  const categoryGuess = guessCategorySlug({
    sourceId: SOURCE_ID,
    url: item.url,
    title,
    categoryHint: categoryFromPage,
  });

  return {
    title: title.trim(),
    html: body,
    excerpt: excerptFromHtml(body),
    imageUrl,
    imageAlt,
    sourceName: SOURCE_NAME,
    sourceUrl: item.url,
    sourceId: SOURCE_ID,
    publishedAt: item.publishedAt,
    categoryGuess,
  };
}
