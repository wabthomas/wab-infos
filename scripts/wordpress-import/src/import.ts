/**
 * Script d'import WordPress → Strapi
 *
 * Usage:
 *   1. Exporter le site WordPress : Outils → Exporter → Tout le contenu
 *   2. Placer le fichier XML dans data/wordpress-export.xml
 *   3. Configurer les variables d'environnement (.env)
 *   4. Lancer : npm run import:wordpress
 *
 * Options:
 *   --dry-run    Simule l'import sans écrire dans Strapi
 *   --limit=N    Limite le nombre d'articles importés
 *   --backfill-images  Télécharge les images à la une pour les articles déjà importés
 *   --backfill-meta    Met à jour dates de publication et compteurs de vues (articles existants)
 *   --force-images     Réimporte les images même si une image est déjà liée
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';
import fetch from 'node-fetch';
import FormData from 'form-data';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

// Charger .env racine puis apps/cms/.env (token API)
for (const envFile of [path.join(repoRoot, '.env'), path.join(repoRoot, 'apps/cms/.env')]) {
  if (!fs.existsSync(envFile)) continue;
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

/** WordPress XML peut renvoyer string, number ou { #text } */
function toText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.length ? toText(value[0]) : '';
  if (typeof value === 'object' && '#text' in value) {
    return toText((value as { '#text': unknown })['#text']);
  }
  return String(value).trim();
}

// --- Configuration ---
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:8090';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';
const WP_EXPORT_PATH = process.env.WP_EXPORT_PATH || path.join(__dirname, '../data/wordpress-export.xml');
const WP_BASE_URL = process.env.WP_BASE_URL || 'https://wab-infos.com';
const WP_UPLOADS_PATH = process.env.WP_UPLOADS_PATH || path.join(__dirname, '../data/uploads');
const DRY_RUN = process.argv.includes('--dry-run');
const BACKFILL_IMAGES = process.argv.includes('--backfill-images');
const BACKFILL_META = process.argv.includes('--backfill-meta');
const FORCE_IMAGES = process.argv.includes('--force-images');
const LIMIT = parseInt(getArg('--limit') || '0', 10);
const OFFSET = parseInt(getArg('--offset') || '0', 10);

function getArg(name: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`${name}=`));
  return arg?.split('=')[1];
}

interface WpItem {
  title: string;
  'wp:post_id': number;
  'wp:post_date': string;
  'wp:post_date_gmt'?: string;
  'wp:post_modified'?: string;
  'wp:post_modified_gmt'?: string;
  'wp:post_name': string;
  'wp:status': string;
  'wp:post_type': string;
  'content:encoded'?: string;
  'excerpt:encoded'?: string;
  category?: WpCategory | WpCategory[];
  'wp:postmeta'?: WpPostMeta | WpPostMeta[];
  'wp:attachment_url'?: string;
}

interface WpCategory {
  '@_domain': string;
  '@_nicename': string;
  '#text': string;
}

interface WpPostMeta {
  'wp:meta_key': string;
  'wp:meta_value': string;
}

interface WpAuthor {
  'wp:author_id': number;
  'wp:author_login': string;
  'wp:author_email': string;
  'wp:author_display_name': string;
}

const CATEGORY_MAP: Record<string, string> = {
  'actualite': 'actualite',
  'actualites-rdc': 'actualites-rdc',
  'actualites': 'actualites-rdc',
  'politique': 'politique',
  'economie': 'economie',
  'securite': 'securite',
  'societe': 'societe',
  'sports': 'sports',
  'sport': 'sports',
  'international': 'international',
  'technologies': 'technologies',
  'tech': 'technologies',
  'tv': 'wab-infos-tv',
  'wab-infos-tv': 'wab-infos-tv',
};

const redirects: Record<string, string> = {};
const stats = {
  articles: 0,
  categories: 0,
  tags: 0,
  authors: 0,
  images: 0,
  meta: 0,
  errors: 0,
  skipped: 0,
};

const cache = {
  categories: new Map<string, string>(),
  tags: new Map<string, string>(),
  authors: new Map<string, string>(),
};

async function strapiRequest(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<unknown> {
  const res = await fetch(`${STRAPI_URL}/api${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strapi ${method} ${endpoint}: ${res.status} — ${text}`);
  }

  return res.json();
}

async function uploadImageFromUrl(imageUrl: string, alt?: string): Promise<number | null> {
  if (DRY_RUN) return 1;

  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    const filename = path.basename(new URL(imageUrl).pathname) || 'image.jpg';
    const contentType = res.headers.get('content-type') || 'image/jpeg';

    const form = new FormData();
    form.append('files', buffer, { filename, contentType });
    if (alt) form.append('fileInfo', JSON.stringify({ alternativeText: alt }));

    const uploadRes = await fetch(`${STRAPI_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
      body: form as unknown as BodyInit,
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      console.error(`  ✗ Upload ${imageUrl}: ${uploadRes.status} — ${text.slice(0, 150)}`);
      return null;
    }
    const data = (await uploadRes.json()) as { id?: number }[];
    const mediaId = data[0]?.id ?? null;
    if (!mediaId) {
      console.error(`  ✗ Upload sans id: ${imageUrl}`);
    }
    return mediaId;
  } catch (err) {
    console.error(`  ✗ Téléchargement ${imageUrl}:`, err);
    return null;
  }
}

async function uploadImage(filePath: string, alt?: string): Promise<number | null> {
  if (!fs.existsSync(filePath)) return null;
  if (DRY_RUN) return 1;

  const form = new FormData();
  form.append('files', fs.createReadStream(filePath));
  if (alt) form.append('fileInfo', JSON.stringify({ alternativeText: alt }));

  const res = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
    body: form as unknown as BodyInit,
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { id: number }[];
  return data[0]?.id ?? null;
}

function toArray<T>(item: T | T[] | undefined): T[] {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

function stripHtml(html: string): string {
  return toText(html).replace(/<[^>]*>/g, '').trim();
}

function calculateReadingTime(content: string): number {
  const words = stripHtml(content).split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Clés postmeta WordPress courantes pour les compteurs de vues */
const VIEW_META_KEYS = [
  'views',
  'post_views_count',
  'pvc_views',
  '_post_views',
  'view_count',
  'wpb_post_views_count',
  'jetpack_post_views',
  'pageviews',
] as const;

function getPostMeta(item: WpItem, key: string): string {
  const postmeta = toArray(item['wp:postmeta']);
  const meta = postmeta.find((m) => toText(m['wp:meta_key']) === key);
  return meta ? toText(meta['wp:meta_value']) : '';
}

function extractViewCount(item: WpItem): number {
  for (const key of VIEW_META_KEYS) {
    const raw = getPostMeta(item, key);
    if (!raw) continue;
    const value = parseInt(raw.replace(/\D/g, ''), 10);
    if (!Number.isNaN(value) && value >= 0) return value;
  }
  return 0;
}

function parseWpDate(dateStr: string, gmt = false): string | null {
  const raw = toText(dateStr);
  if (!raw) return null;

  let normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  if (gmt && !normalized.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(normalized)) {
    normalized = `${normalized}Z`;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function getWordPressDates(item: WpItem): { publishedAt: string | null; updatedAt: string | null } {
  const publishedAt =
    parseWpDate(toText(item['wp:post_date_gmt']), true) ||
    parseWpDate(toText(item['wp:post_date'])) ||
    null;

  const updatedAt =
    parseWpDate(toText(item['wp:post_modified_gmt']), true) ||
    parseWpDate(toText(item['wp:post_modified'])) ||
    publishedAt;

  return { publishedAt, updatedAt };
}

function getPostType(item: WpItem): string {
  const raw = item as Record<string, unknown>;
  return toText(item['wp:post_type'] ?? raw.post_type).toLowerCase();
}

function isPublishedPost(item: WpItem): boolean {
  return getPostType(item) === 'post';
}

/** Strapi n'accepte que [A-Za-z0-9-_.~] — décode les slugs WordPress (%e1%b5%89 → ᵉ…) */
function normalizeSlug(raw: string, fallbackId?: number): string {
  let slug = toText(raw);

  try {
    if (/%[0-9A-Fa-f]{2}/.test(slug)) {
      slug = decodeURIComponent(slug);
    }
  } catch {
    // slug WordPress mal encodé — on nettoie ci-dessous
  }

  slug = slug
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9-_.~]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) {
    slug = typeof fallbackId === 'number' ? `article-${fallbackId}` : 'article';
  }

  return slug.slice(0, 200);
}

function buildAttachmentMap(items: WpItem[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) {
    if (getPostType(item) !== 'attachment') continue;
    const id = toText(item['wp:post_id']);
    const url = toText(item['wp:attachment_url']);
    if (id && url) map.set(id, url);
  }
  return map;
}

async function resolveFeaturedMediaId(
  item: WpItem,
  title: string,
  attachmentMap: Map<string, string>
): Promise<number | null> {
  const postmeta = toArray(item['wp:postmeta']);
  const thumbnailMeta = postmeta.find((m) => toText(m['wp:meta_key']) === '_thumbnail_id');
  if (!thumbnailMeta) return null;

  const thumbId = toText(thumbnailMeta['wp:meta_value']);
  const remoteUrl = attachmentMap.get(thumbId);
  if (remoteUrl) {
    return uploadImageFromUrl(remoteUrl, title);
  }

  const localPath = path.join(WP_UPLOADS_PATH, `${thumbId}.jpg`);
  return uploadImage(localPath, title);
}

async function importAuthor(wpAuthor: WpAuthor): Promise<string | null> {
  const login = toText(wpAuthor['wp:author_login']);
  if (!login) return null;

  const slug = login.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (!slug) return null;
  if (cache.authors.has(slug)) return cache.authors.get(slug)!;

  if (DRY_RUN) {
    cache.authors.set(slug, 'dry-run');
    stats.authors++;
    return 'dry-run';
  }

  try {
    const existing = await strapiRequest('GET', `/authors?filters[slug][$eq]=${slug}`) as { data: { documentId: string }[] };
    if (existing.data?.length) {
      cache.authors.set(slug, existing.data[0].documentId);
      return existing.data[0].documentId;
    }

    const result = await strapiRequest('POST', '/authors', {
      data: {
        name: toText(wpAuthor['wp:author_display_name']) || login,
        slug,
        email: toText(wpAuthor['wp:author_email']),
        wpId: Number(wpAuthor['wp:author_id']) || undefined,
      },
    }) as { data: { documentId: string } };

    cache.authors.set(slug, result.data.documentId);
    stats.authors++;
    return result.data.documentId;
  } catch (err) {
    console.error(`  ✗ Auteur ${slug}:`, err);
    stats.errors++;
    return null;
  }
}

async function importCategory(nicename: string, name: string): Promise<string | null> {
  const nicenameStr = toText(nicename);
  const nameStr = toText(name);
  const slug = CATEGORY_MAP[nicenameStr] || nicenameStr;
  if (cache.categories.has(slug)) return cache.categories.get(slug)!;

  if (DRY_RUN) {
    cache.categories.set(slug, 'dry-run');
    return 'dry-run';
  }

  try {
    const existing = await strapiRequest('GET', `/categories?filters[slug][$eq]=${slug}`) as { data: { documentId: string }[] };
    if (existing.data?.length) {
      cache.categories.set(slug, existing.data[0].documentId);
      return existing.data[0].documentId;
    }

    const result = await strapiRequest('POST', '/categories', {
      data: { name: nameStr || slug, slug },
    }) as { data: { documentId: string } };

    cache.categories.set(slug, result.data.documentId);
    stats.categories++;
    return result.data.documentId;
  } catch {
    return null;
  }
}

async function importTag(nicename: string, name: string): Promise<string | null> {
  const nicenameStr = toText(nicename);
  const nameStr = toText(name);
  if (cache.tags.has(nicenameStr)) return cache.tags.get(nicenameStr)!;

  if (DRY_RUN) {
    cache.tags.set(nicenameStr, 'dry-run');
    stats.tags++;
    return 'dry-run';
  }

  try {
    const existing = await strapiRequest('GET', `/tags?filters[slug][$eq]=${nicenameStr}`) as { data: { documentId: string }[] };
    if (existing.data?.length) {
      cache.tags.set(nicenameStr, existing.data[0].documentId);
      return existing.data[0].documentId;
    }

    const result = await strapiRequest('POST', '/tags', {
      data: { name: nameStr || nicenameStr, slug: nicenameStr },
    }) as { data: { documentId: string } };

    cache.tags.set(nicenameStr, result.data.documentId);
    stats.tags++;
    return result.data.documentId;
  } catch {
    return null;
  }
}

async function importArticle(
  item: WpItem,
  authorMap: Map<number, string>,
  attachmentMap: Map<string, string>
): Promise<void> {
  const wpId = Number(item['wp:post_id']) || 0;
  const slug = normalizeSlug(toText(item['wp:post_name']), wpId);
  const title = toText(item.title);
  const content = toText(item['content:encoded']);
  const excerpt = toText(item['excerpt:encoded']) || stripHtml(content).slice(0, 300);

  if (!title || !slug) {
    stats.skipped++;
    return;
  }

  // Catégories et tags
  const categories = toArray(item.category).filter((c) => c['@_domain'] === 'category');
  const tags = toArray(item.category).filter((c) => c['@_domain'] === 'post_tag');

  let categoryId: string | null = null;
  for (const cat of categories) {
    categoryId = await importCategory(toText(cat['@_nicename']), toText(cat['#text']));
    if (categoryId) break;
  }

  const tagIds: string[] = [];
  for (const tag of tags) {
    const id = await importTag(toText(tag['@_nicename']), toText(tag['#text']));
    if (id) tagIds.push(id);
  }

  const featuredImageId = await resolveFeaturedMediaId(item, title, attachmentMap);
  if (featuredImageId) stats.images++;

  const { publishedAt } = getWordPressDates(item);
  const viewCount = extractViewCount(item);
  const wpStatus = toText(item['wp:status']);
  const isPublished = wpStatus === 'publish';

  const oldUrl = `${WP_BASE_URL}/${categories[0]?.['@_nicename'] || 'actualites'}/${slug}`;
  const newCategory = categories[0]?.['@_nicename']
    ? CATEGORY_MAP[categories[0]['@_nicename']] || categories[0]['@_nicename']
    : 'actualites-rdc';
  const newUrl = `/${newCategory}/${slug}`;

  if (oldUrl !== newUrl) {
    redirects[oldUrl.replace(WP_BASE_URL, '')] = newUrl;
  }

  if (DRY_RUN) {
    stats.articles++;
    const viewsLabel = viewCount > 0 ? ` | ${viewCount} vues` : '';
    const dateLabel = publishedAt ? ` | ${publishedAt.slice(0, 10)}` : '';
    console.log(`  [DRY] ${title.slice(0, 50)}...${dateLabel}${viewsLabel}`);
    return;
  }

  try {
    const existing = await strapiRequest('GET', `/articles?filters[wpId][$eq]=${wpId}`) as { data: { documentId: string }[] };
    if (existing.data?.length) {
      stats.skipped++;
      return;
    }

    const articleData: Record<string, unknown> = {
      title,
      slug,
      excerpt: stripHtml(excerpt).slice(0, 500),
      content,
      status: isPublished ? 'published' : 'draft',
      wpId,
      readingTime: calculateReadingTime(content),
      viewCount,
      canonicalUrl: oldUrl,
      category: categoryId,
      tags: tagIds.length ? tagIds : undefined,
      featuredImage: featuredImageId,
      seoTitle: title.slice(0, 70),
      seoDescription: stripHtml(excerpt).slice(0, 160),
    };

    if (publishedAt) articleData.publishedAt = publishedAt;
    // updatedAt : géré par Strapi (non modifiable via l'API REST v5)

    const createEndpoint = isPublished ? '/articles?status=published' : '/articles';
    await strapiRequest('POST', createEndpoint, { data: articleData });

    stats.articles++;
    if (stats.articles % 100 === 0) {
      console.log(`  → ${stats.articles} articles importés...`);
    }
  } catch (err) {
    console.error(`  ✗ Article "${title.slice(0, 40)}":`, err);
    stats.errors++;
  }
}

function hasFeaturedImage(featuredImage: unknown): boolean {
  if (!featuredImage || FORCE_IMAGES) return false;
  if (typeof featuredImage !== 'object') return false;
  const record = featuredImage as Record<string, unknown>;
  if (record.url) return true;
  if (record.id) return true;
  return false;
}

async function backfillFeaturedImages(
  items: WpItem[],
  attachmentMap: Map<string, string>
): Promise<void> {
  console.log('🖼 Import des images à la une (articles existants)...');
  console.log(`  Pièces jointes dans le XML : ${attachmentMap.size}`);

  let posts = items.filter(isPublishedPost);
  if (OFFSET > 0) posts = posts.slice(OFFSET);
  if (LIMIT > 0) posts = posts.slice(0, LIMIT);

  console.log(`  Articles à traiter : ${posts.length}`);

  for (const item of posts) {
    const wpId = Number(item['wp:post_id']) || 0;
    const title = toText(item.title);
    if (!wpId) continue;

    try {
      const existing = (await strapiRequest(
        'GET',
        `/articles?filters[wpId][$eq]=${wpId}&populate=featuredImage&pagination[pageSize]=1`
      )) as { data: { documentId: string; featuredImage?: unknown | null }[] };

      const article = existing.data?.[0];
      if (!article) {
        stats.skipped++;
        continue;
      }
      if (hasFeaturedImage(article.featuredImage)) {
        stats.skipped++;
        continue;
      }

      const mediaId = await resolveFeaturedMediaId(item, title, attachmentMap);
      if (!mediaId) {
        console.error(`  ✗ Pas d'image pour wpId=${wpId} "${title.slice(0, 40)}"`);
        stats.errors++;
        continue;
      }

      if (DRY_RUN) {
        stats.images++;
        console.log(`  [DRY] Image → ${title.slice(0, 50)}...`);
        continue;
      }

      await strapiRequest('PUT', `/articles/${article.documentId}?status=published`, {
        data: { featuredImage: mediaId },
      });

      stats.images++;
      if (stats.images % 50 === 0) {
        console.log(`  → ${stats.images} images importées...`);
      }
    } catch (err) {
      console.error(`  ✗ Image "${title.slice(0, 40)}":`, err);
      stats.errors++;
    }
  }
}

async function backfillArticleMeta(items: WpItem[]): Promise<void> {
  console.log('📅 Mise à jour des dates et compteurs de vues...');

  let posts = items.filter(isPublishedPost);
  if (OFFSET > 0) posts = posts.slice(OFFSET);
  if (LIMIT > 0) posts = posts.slice(0, LIMIT);

  console.log(`  Articles à traiter : ${posts.length}`);

  for (const item of posts) {
    const wpId = Number(item['wp:post_id']) || 0;
    const title = toText(item.title);
    if (!wpId) continue;

    const { publishedAt } = getWordPressDates(item);
    const viewCount = extractViewCount(item);

    if (!publishedAt && viewCount === 0) {
      stats.skipped++;
      continue;
    }

    try {
      const existing = (await strapiRequest(
        'GET',
        `/articles?filters[wpId][$eq]=${wpId}&pagination[pageSize]=1`
      )) as { data: { documentId: string }[] };

      const article = existing.data?.[0];
      if (!article) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN) {
        stats.meta++;
        console.log(
          `  [DRY] Meta → ${title.slice(0, 40)} | ${publishedAt?.slice(0, 10) ?? '—'} | ${viewCount} vues`
        );
        continue;
      }

      const data: Record<string, unknown> = {};
      if (publishedAt) data.publishedAt = publishedAt;
      if (viewCount > 0) data.viewCount = viewCount;

      await strapiRequest('PUT', `/articles/${article.documentId}?status=published`, { data });
      stats.meta++;

      if (stats.meta % 100 === 0) {
        console.log(`  → ${stats.meta} articles mis à jour...`);
      }
    } catch (err) {
      console.error(`  ✗ Meta "${title.slice(0, 40)}":`, err);
      stats.errors++;
    }
  }
}

function printResults(redirectsPath?: string): void {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  Résultats');
  console.log('═══════════════════════════════════════════');
  console.log(`  Articles  : ${stats.articles}`);
  console.log(`  Catégories: ${stats.categories}`);
  console.log(`  Tags      : ${stats.tags}`);
  console.log(`  Auteurs   : ${stats.authors}`);
  console.log(`  Images    : ${stats.images}`);
  console.log(`  Meta      : ${stats.meta}`);
  console.log(`  Ignorés   : ${stats.skipped}`);
  console.log(`  Erreurs   : ${stats.errors}`);
  if (redirectsPath) {
    console.log(`  Redirections: ${Object.keys(redirects).length} → ${redirectsPath}`);
  }
  console.log('');
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Wab-infos — Import WordPress → Strapi');
  console.log('═══════════════════════════════════════════');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'PRODUCTION'}${BACKFILL_IMAGES ? ' (images)' : ''}${BACKFILL_META ? ' (meta)' : ''}`);
  console.log(`Fichier: ${WP_EXPORT_PATH}`);
  console.log(`Strapi: ${STRAPI_URL}`);
  if (!STRAPI_TOKEN && !DRY_RUN) {
    console.error('STRAPI_API_TOKEN manquant dans .env');
    process.exit(1);
  }

  if (!DRY_RUN) {
    if (/your-strapi|change-me|placeholder/i.test(STRAPI_TOKEN)) {
      console.error('STRAPI_API_TOKEN est encore une valeur placeholder dans .env');
      process.exit(1);
    }
    try {
      await strapiRequest('GET', '/articles?pagination[pageSize]=1');
      console.log('✓ Token API Strapi valide');
    } catch {
      console.error('✗ Token API Strapi refusé (401).');
      console.error('  Strapi admin → Settings → API Tokens → Create → Full access');
      console.error('  Puis ajoutez STRAPI_API_TOKEN=... dans ~/wab-infos/.env');
      process.exit(1);
    }
  }

  console.log('');

  if (!fs.existsSync(WP_EXPORT_PATH)) {
    console.error(`Fichier d'export introuvable : ${WP_EXPORT_PATH}`);
    console.error('Exportez votre site WordPress et placez le XML dans data/wordpress-export.xml');
    process.exit(1);
  }

  const xml = fs.readFileSync(WP_EXPORT_PATH, 'utf-8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    cdataPropName: '#text',
  });

  const parsed = parser.parse(xml);
  const channel = parsed.rss?.channel;
  if (!channel) {
    console.error('Format XML WordPress invalide');
    process.exit(1);
  }

  const rawItems = toArray(channel.item as WpItem);
  const attachmentMap = buildAttachmentMap(rawItems);

  if (BACKFILL_IMAGES) {
    await backfillFeaturedImages(rawItems, attachmentMap);
    printResults();
    return;
  }

  if (BACKFILL_META) {
    await backfillArticleMeta(rawItems);
    printResults();
    return;
  }

  // Import auteurs
  console.log('📋 Import des auteurs...');
  const wpAuthors = toArray(channel['wp:author'] as WpAuthor);
  const authorMap = new Map<number, string>();
  for (const author of wpAuthors) {
    const docId = await importAuthor(author);
    if (docId) authorMap.set(author['wp:author_id'], docId);
  }
  console.log(`  ✓ ${stats.authors} auteurs`);

  // Import articles
  console.log('📰 Import des articles...');
  console.log(`  Éléments XML bruts : ${rawItems.length}`);
  console.log(`  Pièces jointes (images) : ${attachmentMap.size}`);

  if (rawItems.length > 0) {
    const types = [...new Set(rawItems.map((item) => getPostType(item) || '(vide)'))];
    console.log(`  Types détectés : ${types.slice(0, 12).join(', ')}`);
  }

  let items = rawItems.filter(isPublishedPost);
  console.log(`  Articles (post) : ${items.length}`);

  if (OFFSET > 0) items = items.slice(OFFSET);
  if (LIMIT > 0) items = items.slice(0, LIMIT);

  console.log(`  Total à traiter : ${items.length}`);

  for (const item of items) {
    await importArticle(item, authorMap, attachmentMap);
  }

  // Sauvegarder les redirections
  const redirectsPath = path.join(path.dirname(WP_EXPORT_PATH), 'redirects.json');
  fs.writeFileSync(redirectsPath, JSON.stringify(redirects, null, 2));

  printResults(redirectsPath);
}

main().catch((err) => {
  console.error('Import échoué:', err);
  process.exit(1);
});
