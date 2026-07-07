/**
 * Génère apps/web/src/data/wp-redirects.json
 *
 * 1. Depuis Strapi (STRAPI_URL + STRAPI_API_TOKEN) si disponible
 * 2. Sinon depuis le sitemap public (NEXT_PUBLIC_SITE_URL ou wab-infos.com)
 *
 * Usage : npm run redirects:wp --workspace=web
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import qs from 'qs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, '..');
const repoRoot = path.resolve(appDir, '../..');
const outPath = path.join(appDir, 'src/data/wp-redirects.json');

for (const envFile of [
  path.join(repoRoot, '.env'),
  path.join(repoRoot, 'apps/cms/.env'),
  path.join(appDir, '.env.local'),
]) {
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

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wab-infos.com').replace(/\/$/, '');
const STRAPI_URL = (process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || '').replace(
  /\/$/,
  ''
);
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';

const VALID_CATEGORIES = new Set([
  'actualite',
  'actualites-rdc',
  'politique',
  'economie',
  'securite',
  'societe',
  'sports',
  'international',
  'technologies',
  'wab-infos-tv',
]);

function addPath(paths, from, to) {
  if (!from || !to || from === to) return;
  paths[from] = to;
}

function buildMapsFromArticles(articles, source) {
  const slugs = {};
  const paths = {};

  for (const article of articles) {
    const slug = article.slug?.trim();
    if (!slug) continue;

    let target = article.target;
    if (!target) {
      const category = article.categorySlug && VALID_CATEGORIES.has(article.categorySlug)
        ? article.categorySlug
        : 'actualite';
      target = `/${category}/${slug}`;
    }

    slugs[slug] = target;
    addPath(paths, `/${slug}`, target);

    const canonical = article.canonicalUrl?.trim();
    if (canonical) {
      try {
        const parsed = new URL(canonical, SITE_URL);
        addPath(paths, parsed.pathname.replace(/\/$/, ''), target);
      } catch {
        // ignore
      }
    }
  }

  return { slugs, paths, source, articleCount: articles.length };
}

async function fetchFromStrapi() {
  if (!STRAPI_URL || !STRAPI_TOKEN) return null;

  const pageSize = 100;
  let page = 1;
  const rows = [];

  while (true) {
    const query = qs.stringify(
      {
        filters: { status: { $eq: 'published' } },
        fields: ['slug', 'canonicalUrl'],
        populate: { category: { fields: ['slug'] } },
        pagination: { page, pageSize },
        status: 'published',
      },
      { encodeValuesOnly: true }
    );

    const res = await fetch(`${STRAPI_URL}/api/articles?${query}`, {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
    });

    if (!res.ok) {
      console.warn(`[wp-redirects] Strapi indisponible (${res.status}), repli sitemap…`);
      return null;
    }

    const body = await res.json();
    rows.push(...(body.data ?? []));
    const pageCount = body.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) break;
    page += 1;
  }

  const articles = rows.map((row) => ({
    slug: row.slug,
    canonicalUrl: row.canonicalUrl,
    categorySlug: row.category?.slug,
  }));

  return buildMapsFromArticles(articles, 'strapi');
}

async function fetchFromSitemap() {
  const res = await fetch(`${SITE_URL}/sitemap.xml`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Sitemap ${res.status}`);

  const xml = await res.text();
  const articles = [];

  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url = match[1];
    try {
      const parsed = new URL(url);
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length !== 2) continue;
      const [categorySlug, slug] = segments;
      if (!VALID_CATEGORIES.has(categorySlug)) continue;
      articles.push({
        slug,
        target: `/${categorySlug}/${slug}`,
      });
    } catch {
      // ignore
    }
  }

  return buildMapsFromArticles(articles, 'sitemap');
}

async function main() {
  let result = null;

  try {
    result = await fetchFromStrapi();
    if (!result) {
      result = await fetchFromSitemap();
    }
  } catch (err) {
    console.warn(`[wp-redirects] Génération en ligne impossible: ${err?.message || err}`);
  }

  if (!result && fs.existsSync(outPath)) {
    const existing = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    console.info(
      `[wp-redirects] Fichier existant conservé (${existing.articleCount ?? '?'} articles, ` +
        `généré le ${existing.generatedAt ?? '?'})`
    );
    return;
  }

  if (!result) {
    const empty = {
      generatedAt: new Date().toISOString(),
      source: 'empty',
      articleCount: 0,
      slugs: {},
      paths: {},
    };
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(empty));
    console.warn('[wp-redirects] Aucune source disponible — fichier vide créé.');
    return;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: result.source,
    articleCount: result.articleCount,
    slugs: result.slugs,
    paths: result.paths,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload));

  console.info(
    `[wp-redirects] ${result.articleCount} articles (${result.source}) → ` +
      `${Object.keys(result.slugs).length} slugs, ${Object.keys(result.paths).length} chemins`
  );
}

await main();
