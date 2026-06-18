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
 *   --offset=N   Commence à l'article N (reprise après erreur)
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

async function importArticle(item: WpItem, authorMap: Map<number, string>): Promise<void> {
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

  // Image à la une
  const postmeta = toArray(item['wp:postmeta']);
  const thumbnailMeta = postmeta.find((m) => m['wp:meta_key'] === '_thumbnail_id');
  let featuredImageId: number | null = null;

  if (thumbnailMeta) {
    const thumbId = thumbnailMeta['wp:meta_value'];
    const localPath = path.join(WP_UPLOADS_PATH, `${thumbId}.jpg`);
    featuredImageId = await uploadImage(localPath, title);
    if (featuredImageId) stats.images++;
  }

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
    console.log(`  [DRY] ${title.slice(0, 60)}...`);
    return;
  }

  try {
    const existing = await strapiRequest('GET', `/articles?filters[wpId][$eq]=${wpId}`) as { data: unknown[] };
    if (existing.data?.length) {
      stats.skipped++;
      return;
    }

    await strapiRequest('POST', '/articles', {
      data: {
        title,
        slug,
        excerpt: stripHtml(excerpt).slice(0, 500),
        content,
        status: toText(item['wp:status']) === 'publish' ? 'published' : 'draft',
        publishedAt: toText(item['wp:post_date']),
        wpId,
        readingTime: calculateReadingTime(content),
        canonicalUrl: oldUrl,
        category: categoryId,
        tags: tagIds.length ? tagIds : undefined,
        featuredImage: featuredImageId,
        seoTitle: title.slice(0, 70),
        seoDescription: stripHtml(excerpt).slice(0, 160),
      },
    });

    stats.articles++;
    if (stats.articles % 100 === 0) {
      console.log(`  → ${stats.articles} articles importés...`);
    }
  } catch (err) {
    console.error(`  ✗ Article "${title.slice(0, 40)}":`, err);
    stats.errors++;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Wab-infos — Import WordPress → Strapi');
  console.log('═══════════════════════════════════════════');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'PRODUCTION'}`);
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
  const rawItems = toArray(channel.item as WpItem);
  console.log(`  Éléments XML bruts : ${rawItems.length}`);

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
    await importArticle(item, authorMap);
  }

  // Sauvegarder les redirections
  const redirectsPath = path.join(path.dirname(WP_EXPORT_PATH), 'redirects.json');
  fs.writeFileSync(redirectsPath, JSON.stringify(redirects, null, 2));

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  Résultats');
  console.log('═══════════════════════════════════════════');
  console.log(`  Articles  : ${stats.articles}`);
  console.log(`  Catégories: ${stats.categories}`);
  console.log(`  Tags      : ${stats.tags}`);
  console.log(`  Auteurs   : ${stats.authors}`);
  console.log(`  Images    : ${stats.images}`);
  console.log(`  Ignorés   : ${stats.skipped}`);
  console.log(`  Erreurs   : ${stats.errors}`);
  console.log(`  Redirections: ${Object.keys(redirects).length} → ${redirectsPath}`);
  console.log('');
}

main().catch((err) => {
  console.error('Import échoué:', err);
  process.exit(1);
});
