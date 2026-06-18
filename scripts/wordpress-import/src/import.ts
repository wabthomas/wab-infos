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
import { XMLParser } from 'fast-xml-parser';
import fetch from 'node-fetch';
import FormData from 'form-data';

// --- Configuration ---
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:8090';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';
const WP_EXPORT_PATH = process.env.WP_EXPORT_PATH || './data/wordpress-export.xml';
const WP_BASE_URL = process.env.WP_BASE_URL || 'https://wab-infos.com';
const WP_UPLOADS_PATH = process.env.WP_UPLOADS_PATH || './data/uploads';
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
  return html.replace(/<[^>]*>/g, '').trim();
}

function calculateReadingTime(content: string): number {
  const words = stripHtml(content).split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

async function importAuthor(wpAuthor: WpAuthor): Promise<string | null> {
  const slug = wpAuthor['wp:author_login'].toLowerCase().replace(/[^a-z0-9-]/g, '-');
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
        name: wpAuthor['wp:author_display_name'],
        slug,
        email: wpAuthor['wp:author_email'],
        wpId: wpAuthor['wp:author_id'],
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
  const slug = CATEGORY_MAP[nicename] || nicename;
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
      data: { name, slug },
    }) as { data: { documentId: string } };

    cache.categories.set(slug, result.data.documentId);
    stats.categories++;
    return result.data.documentId;
  } catch {
    return null;
  }
}

async function importTag(nicename: string, name: string): Promise<string | null> {
  if (cache.tags.has(nicename)) return cache.tags.get(nicename)!;

  if (DRY_RUN) {
    cache.tags.set(nicename, 'dry-run');
    stats.tags++;
    return 'dry-run';
  }

  try {
    const existing = await strapiRequest('GET', `/tags?filters[slug][$eq]=${nicename}`) as { data: { documentId: string }[] };
    if (existing.data?.length) {
      cache.tags.set(nicename, existing.data[0].documentId);
      return existing.data[0].documentId;
    }

    const result = await strapiRequest('POST', '/tags', {
      data: { name, slug: nicename },
    }) as { data: { documentId: string } };

    cache.tags.set(nicename, result.data.documentId);
    stats.tags++;
    return result.data.documentId;
  } catch {
    return null;
  }
}

async function importArticle(item: WpItem, authorMap: Map<number, string>): Promise<void> {
  const wpId = item['wp:post_id'];
  const slug = item['wp:post_name'];
  const title = typeof item.title === 'string' ? item.title : '';
  const content = item['content:encoded'] || '';
  const excerpt = item['excerpt:encoded'] || stripHtml(content).slice(0, 300);

  if (!title || !slug) {
    stats.skipped++;
    return;
  }

  // Catégories et tags
  const categories = toArray(item.category).filter((c) => c['@_domain'] === 'category');
  const tags = toArray(item.category).filter((c) => c['@_domain'] === 'post_tag');

  let categoryId: string | null = null;
  for (const cat of categories) {
    categoryId = await importCategory(cat['@_nicename'], cat['#text']);
    if (categoryId) break;
  }

  const tagIds: string[] = [];
  for (const tag of tags) {
    const id = await importTag(tag['@_nicename'], tag['#text']);
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
        status: item['wp:status'] === 'publish' ? 'published' : 'draft',
        publishedAt: item['wp:post_date'],
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
  let items = toArray(channel.item as WpItem).filter(
    (item) => item['wp:post_type'] === 'post'
  );

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
