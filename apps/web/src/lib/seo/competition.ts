import type {
  SeoCompetitionGap,
  SeoCompetitionSnapshot,
  SeoCompetitorSource,
  SeoHeadline,
  SeoKeywordCount,
  SeoOurStats,
} from '@wab-infos/shared';
import { getArticlePath, siteConfig } from '@/config/site';
import { discoverFromRssList } from '@/lib/news-ingest/discover';
import { NEWS_SOURCES } from '@/lib/news-ingest/sources';
import type { NewsSourceConfig } from '@/lib/news-ingest/types';
import { getIndexingHealth } from '@/lib/seo/health';
import { getRecentArticlesForNewsSitemap } from '@/lib/strapi';
import { getArticleDisplayDate } from '@/lib/utils';

/**
 * Veille concurrence SEO.
 *
 * On lit les flux RSS des concurrents (déjà utilisés par l’ingestion) pour
 * mesurer qui publie quoi maintenant, puis on compare à nos titres récents.
 * Objectif : repérer les sujets chauds que nous ne couvrons pas encore, et
 * nourrir l’IA de la rédaction avec ces angles.
 */

const DEFAULT_WINDOW_HOURS = 24;
const CACHE_TTL_MS = 10 * 60 * 1000;

/** Mots vides français + vocabulaire présent dans tous les titres d’actu. */
const STOP_WORDS = new Set([
  'a', 'au', 'aux', 'avec', 'ce', 'ces', 'cet', 'cette', 'comme', 'dans', 'de', 'des', 'du',
  'elle', 'en', 'est', 'et', 'eux', 'il', 'ils', 'je', 'la', 'le', 'les', 'leur', 'leurs',
  'lui', 'ma', 'mais', 'me', 'même', 'mes', 'moi', 'mon', 'ne', 'nos', 'notre', 'nous',
  'on', 'ou', 'où', 'par', 'pas', 'pour', 'qu', 'que', 'qui', 'sa', 'se', 'ses', 'son',
  'sont', 'sur', 'ta', 'te', 'tes', 'toi', 'ton', 'tu', 'un', 'une', 'vos', 'votre', 'vous',
  'été', 'etre', 'être', 'avoir', 'fait', 'faire', 'plus', 'moins', 'très', 'tout', 'tous',
  'toute', 'toutes', 'aussi', 'ainsi', 'alors', 'après', 'avant', 'chez', 'contre', 'déjà',
  'depuis', 'donc', 'dont', 'encore', 'entre', 'lors', 'quand', 'sans', 'selon', 'sous',
  'vers', 'voici', 'voilà', 'cela', 'celui', 'celle', 'ceux', 'dont', 'quoi', 'dont',
  'peut', 'peuvent', 'doit', 'doivent', 'sera', 'seront', 'était', 'étaient', 'ici', 'là',
  'coup', 'point', 'face', 'suite', 'cas', 'fin', 'début', 'jour', 'jours', 'année',
  'ans', 'mois', 'semaine', 'heure', 'heures', 'minute', 'fois', 'part', 'partie',
]);

/**
 * Termes trop génériques pour constituer un « trou de couverture » :
 * ils apparaissent dans presque tous les titres RDC et noieraient les vrais sujets.
 */
const GAP_IGNORED_TERMS = new Set([
  'congo', 'rdc', 'kinshasa', 'lubumbashi', 'goma', 'bukavu', 'mbuji', 'kananga',
  'actualite', 'actualites', 'info', 'infos', 'nouveau', 'nouvelle', 'nouvelles',
  'annonce', 'declare', 'declaration', 'affirme', 'explique', 'indique', 'precise',
  'selon', 'apres', 'entre', 'contre', 'encore', 'toujours', 'video', 'photos',
  'direct', 'exclusif', 'urgent', 'reaction', 'reactions', 'propos', 'interview',
]);

const MIN_TERM_LENGTH = 4;

function normalizeTerm(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function countTerms(titles: string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const title of titles) {
    const seenInTitle = new Set<string>();
    for (const word of normalizeTerm(title).split(/\s+/)) {
      if (word.length < MIN_TERM_LENGTH) continue;
      if (STOP_WORDS.has(word)) continue;
      if (/^\d+$/.test(word)) continue;
      if (seenInTitle.has(word)) continue;
      seenInTitle.add(word);
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return counts;
}

export function extractKeywords(titles: string[], limit = 8): SeoKeywordCount[] {
  return [...countTerms(titles).entries()]
    .filter(([term]) => !GAP_IGNORED_TERMS.has(term))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

function parseTime(value?: string): number {
  if (!value?.trim()) return 0;
  const time = Date.parse(value.trim());
  return Number.isFinite(time) ? time : 0;
}

function isWithinWindow(value: string | undefined, windowHours: number): boolean {
  const time = parseTime(value);
  if (!time) return false;
  return Date.now() - time <= windowHours * 60 * 60 * 1000;
}

async function loadCompetitor(
  source: NewsSourceConfig,
  windowHours: number
): Promise<SeoCompetitorSource> {
  const base: SeoCompetitorSource = {
    id: source.id,
    name: source.name,
    homeUrl: source.homeUrl,
    reachable: false,
    items: 0,
    recent: 0,
    topKeywords: [],
    headlines: [],
  };

  try {
    const items = await discoverFromRssList(source.rssUrls, 30, { timeoutMs: 8_000 });
    if (items.length === 0) {
      return { ...base, error: 'Flux RSS vide ou indisponible' };
    }

    const recent = items.filter((item) => isWithinWindow(item.publishedAt, windowHours));
    const pool = recent.length > 0 ? recent : items;
    const headlines: SeoHeadline[] = pool
      .slice(0, 8)
      .map((item) => ({
        title: item.title?.trim() || item.url,
        url: item.url,
        ...(item.publishedAt ? { publishedAt: item.publishedAt } : {}),
      }));

    const publicationTimes = items.map((item) => parseTime(item.publishedAt)).filter(Boolean);

    return {
      ...base,
      reachable: true,
      items: items.length,
      recent: recent.length,
      ...(publicationTimes.length
        ? { lastPublishedAt: new Date(Math.max(...publicationTimes)).toISOString() }
        : {}),
      topKeywords: extractKeywords(
        pool.map((item) => item.title ?? ''),
        10
      ),
      headlines,
    };
  } catch (error) {
    return {
      ...base,
      error: error instanceof Error ? error.message : 'Erreur de lecture du flux',
    };
  }
}

interface OurStatsWithTerms extends SeoOurStats {
  /** Tous les termes de nos titres (pas seulement le top affiché) pour la comparaison. */
  terms: Map<string, number>;
}

async function loadOurs(windowHours: number): Promise<OurStatsWithTerms> {
  try {
    const articles = await getRecentArticlesForNewsSitemap(windowHours);
    const titles = articles.map((article) => article.title);
    const headlines: SeoHeadline[] = articles.slice(0, 10).map((article) => ({
      title: article.title,
      url: `${siteConfig.url}${getArticlePath(article)}`,
      publishedAt: getArticleDisplayDate(article),
    }));

    return {
      recent: articles.length,
      topKeywords: extractKeywords(titles, 10),
      headlines,
      terms: countTerms(titles),
    };
  } catch (error) {
    return {
      recent: 0,
      topKeywords: [],
      headlines: [],
      terms: new Map<string, number>(),
      error: error instanceof Error ? error.message : 'Strapi indisponible',
    };
  }
}

function buildGaps(
  competitors: SeoCompetitorSource[],
  ourTerms: Map<string, number>
): { gaps: SeoCompetitionGap[]; overlap: SeoCompetitionGap[] } {
  const aggregate = new Map<string, { count: number; sources: Set<string> }>();

  for (const source of competitors) {
    for (const keyword of source.topKeywords) {
      const row = aggregate.get(keyword.term) ?? { count: 0, sources: new Set<string>() };
      row.count += keyword.count;
      row.sources.add(source.name);
      aggregate.set(keyword.term, row);
    }
  }

  const gaps: SeoCompetitionGap[] = [];
  const overlap: SeoCompetitionGap[] = [];

  for (const [term, row] of aggregate.entries()) {
    const ourCount = ourTerms.get(term) ?? 0;
    const entry: SeoCompetitionGap = {
      term,
      competitorCount: row.count,
      ourCount,
      sources: [...row.sources].slice(0, 4),
    };
    if (ourCount === 0 && row.count >= 2) gaps.push(entry);
    else if (ourCount > 0) overlap.push(entry);
  }

  gaps.sort((a, b) => b.competitorCount - a.competitorCount || a.term.localeCompare(b.term));
  overlap.sort((a, b) => b.competitorCount - a.competitorCount || a.term.localeCompare(b.term));

  return { gaps: gaps.slice(0, 10), overlap: overlap.slice(0, 8) };
}

async function buildSnapshot(windowHours: number): Promise<SeoCompetitionSnapshot> {
  const sources = NEWS_SOURCES.filter((source) => source.enabled);

  const [ours, competitors] = await Promise.all([
    loadOurs(windowHours),
    Promise.all(sources.map((source) => loadCompetitor(source, windowHours))),
  ]);

  const { gaps, overlap } = buildGaps(competitors, ours.terms);
  const competitorTotal = competitors.reduce((sum, item) => sum + item.recent, 0);

  competitors.sort((a, b) => b.recent - a.recent);

  // `terms` est interne au calcul : on ne l’expose pas dans la réponse JSON.
  const oursStats: SeoOurStats = {
    recent: ours.recent,
    topKeywords: ours.topKeywords,
    headlines: ours.headlines,
    ...(ours.error ? { error: ours.error } : {}),
  };

  return {
    generatedAt: new Date().toISOString(),
    windowHours,
    ours: oursStats,
    competitors,
    gaps,
    overlap,
    totals: {
      ours: ours.recent,
      competitors: competitorTotal,
      ratio: ours.recent > 0 ? Math.round((competitorTotal / ours.recent) * 10) / 10 : 0,
    },
    indexing: getIndexingHealth(),
  };
}

let cached: { at: number; data: SeoCompetitionSnapshot } | null = null;
let inflight: Promise<SeoCompetitionSnapshot> | null = null;

export async function getCompetitionSnapshot(options?: {
  windowHours?: number;
  force?: boolean;
}): Promise<SeoCompetitionSnapshot> {
  const requested = options?.windowHours;
  const windowHours =
    typeof requested === 'number' && Number.isFinite(requested) && requested > 0
      ? Math.min(72, Math.max(1, Math.floor(requested)))
      : DEFAULT_WINDOW_HOURS;

  if (
    !options?.force &&
    cached &&
    cached.data.windowHours === windowHours &&
    Date.now() - cached.at < CACHE_TTL_MS
  ) {
    return cached.data;
  }

  if (!inflight) {
    inflight = buildSnapshot(windowHours)
      .then((data) => {
        cached = { at: Date.now(), data };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}
