/**
 * Smoke test parsers (sans écriture Strapi).
 * Usage (depuis apps/web) :
 *   npx tsx src/lib/news-ingest/smoke.ts
 *   npx tsx src/lib/news-ingest/smoke.ts radio-okapi
 */
import { discoverSourceItems, NEWS_SOURCES, parseSourceArticle } from './sources';

async function main() {
  const only = process.argv[2];
  const sources = NEWS_SOURCES.filter((s) => s.enabled && (!only || s.id === only));
  for (const source of sources.slice(0, only ? 1 : 2)) {
    console.log(`\n=== ${source.name} ===`);
    const items = await discoverSourceItems(source);
    console.log(`discovered: ${items.length}`);
    const first = items[0];
    if (!first) continue;
    const parsed = await parseSourceArticle(source, first);
    console.log({
      title: parsed.title,
      categoryGuess: parsed.categoryGuess,
      imageUrl: parsed.imageUrl,
      imageAlt: parsed.imageAlt?.slice(0, 80),
      excerpt: parsed.excerpt.slice(0, 120),
      htmlLen: parsed.html.length,
      sourceUrl: parsed.sourceUrl,
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
