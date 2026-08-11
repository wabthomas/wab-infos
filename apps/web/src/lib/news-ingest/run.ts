import {
  countImportedToday,
  createImportedDraft,
  findArticleBySourceUrl,
} from './strapi';
import { NEWS_SOURCES, discoverSourceItems, parseSourceArticle } from './sources';
import type { IngestRunResult, IngestSourceResult, NewsSourceConfig } from './types';

function dailyQuota(): number {
  const n = Number(process.env.NEWS_INGEST_DAILY_QUOTA || 2);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 2;
}

async function ingestOneSource(
  source: NewsSourceConfig,
  quota: number
): Promise<IngestSourceResult> {
  const result: IngestSourceResult = {
    sourceId: source.id,
    discovered: 0,
    created: 0,
    skipped: 0,
    errors: [],
    underQuota: false,
  };

  if (!source.enabled) {
    result.underQuota = true;
    return result;
  }

  let alreadyToday = 0;
  try {
    alreadyToday = await countImportedToday(source.name);
  } catch (err) {
    result.errors.push(
      `countToday: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const remaining = Math.max(0, quota - alreadyToday);
  if (remaining === 0) {
    return result;
  }

  let items = [];
  try {
    items = await discoverSourceItems(source);
    result.discovered = items.length;
  } catch (err) {
    result.errors.push(
      `discover: ${err instanceof Error ? err.message : String(err)}`
    );
    result.underQuota = true;
    return result;
  }

  for (const item of items) {
    if (result.created >= remaining) break;
    try {
      const exists = await findArticleBySourceUrl(item.url);
      if (exists) {
        result.skipped += 1;
        continue;
      }
      const parsed = await parseSourceArticle(source, item);
      await createImportedDraft(parsed);
      result.created += 1;
    } catch (err) {
      result.skipped += 1;
      result.errors.push(
        `${item.url}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const totalToday = alreadyToday + result.created;
  result.underQuota = totalToday < quota;
  return result;
}

export async function runNewsIngest(options?: {
  sourceIds?: string[];
  dryRun?: boolean;
}): Promise<IngestRunResult> {
  const quota = dailyQuota();
  const selected = NEWS_SOURCES.filter((source) => {
    if (!source.enabled) return false;
    if (!options?.sourceIds?.length) return true;
    return options.sourceIds.includes(source.id);
  });

  const sources: IngestSourceResult[] = [];
  for (const source of selected) {
    if (options?.dryRun) {
      try {
        const items = await discoverSourceItems(source);
        sources.push({
          sourceId: source.id,
          discovered: items.length,
          created: 0,
          skipped: 0,
          errors: [],
          underQuota: items.length < quota,
        });
      } catch (err) {
        sources.push({
          sourceId: source.id,
          discovered: 0,
          created: 0,
          skipped: 0,
          errors: [err instanceof Error ? err.message : String(err)],
          underQuota: true,
        });
      }
      continue;
    }
    sources.push(await ingestOneSource(source, quota));
  }

  return {
    ok: true,
    quotaPerSource: quota,
    sources,
    createdTotal: sources.reduce((sum, s) => sum + s.created, 0),
  };
}
