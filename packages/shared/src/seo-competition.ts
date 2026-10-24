/**
 * Veille concurrence SEO — contrat partagé entre le site public (calcul)
 * et l’app rédaction (affichage + brief IA).
 */

export interface SeoKeywordCount {
  term: string;
  count: number;
}

export interface SeoHeadline {
  title: string;
  url: string;
  publishedAt?: string;
}

export interface SeoCompetitorSource {
  id: string;
  name: string;
  homeUrl: string;
  reachable: boolean;
  /** Titres récupérés dans le flux RSS. */
  items: number;
  /** Titres publiés dans la fenêtre analysée. */
  recent: number;
  lastPublishedAt?: string;
  topKeywords: SeoKeywordCount[];
  headlines: SeoHeadline[];
  error?: string;
}

export interface SeoOurStats {
  recent: number;
  topKeywords: SeoKeywordCount[];
  headlines: SeoHeadline[];
  error?: string;
}

export interface SeoCompetitionGap {
  term: string;
  competitorCount: number;
  ourCount: number;
  /** Médias concurrents qui ont traité le sujet. */
  sources: string[];
}

export interface SeoIndexingHealth {
  indexNowConfigured: boolean;
  googleIndexingConfigured: boolean;
  cloudflarePurgeConfigured: boolean;
  newsPublication: string;
  newsSitemapUrl: string;
  sitemapUrl: string;
  videosSitemapUrl: string;
  feedUrl: string;
}

export interface SeoCompetitionSnapshot {
  generatedAt: string;
  /** Fenêtre d’analyse en heures (24 par défaut). */
  windowHours: number;
  ours: SeoOurStats;
  competitors: SeoCompetitorSource[];
  /** Sujets traités par la concurrence, absents de nos titres récents. */
  gaps: SeoCompetitionGap[];
  /** Sujets déjà couverts des deux côtés. */
  overlap: SeoCompetitionGap[];
  totals: {
    ours: number;
    competitors: number;
    /** Nombre de titres concurrents par titre Wab-infos (0 si non calculable). */
    ratio: number;
  };
  indexing: SeoIndexingHealth;
}

export type SeoBriefUrgency = 'breaking' | 'daily' | 'evergreen';

/** Brief éditorial généré par l’IA à partir d’un trou de couverture. */
export interface SeoBrief {
  angle: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyphrase: string;
  secondaryKeywords: string[];
  outline: string[];
  mustHaveFacts: string[];
  sources: string[];
  urgency: SeoBriefUrgency;
  /** Renseigné par le serveur quand un fournisseur IA a répondu. */
  provider?: string;
}

function clampText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function clampList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const row of value) {
    const text = clampText(row, maxLength);
    if (text && !out.includes(text)) out.push(text);
    if (out.length >= maxItems) break;
  }
  return out;
}

/** Normalise une réponse modèle (JSON non fiable) en brief utilisable. */
export function normalizeSeoBrief(raw: unknown): SeoBrief | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const title = clampText(row.title, 200);
  const focusKeyphrase = clampText(row.focusKeyphrase, 80);
  if (!title || !focusKeyphrase) return null;

  const urgencyRaw = clampText(row.urgency, 20).toLowerCase();
  const urgency: SeoBriefUrgency =
    urgencyRaw === 'breaking' || urgencyRaw === 'evergreen' ? urgencyRaw : 'daily';

  return {
    angle: clampText(row.angle, 600),
    title,
    seoTitle: clampText(row.seoTitle, 70) || title.slice(0, 70),
    seoDescription: clampText(row.seoDescription, 160),
    focusKeyphrase,
    secondaryKeywords: clampList(row.secondaryKeywords, 8, 60),
    outline: clampList(row.outline, 8, 160),
    mustHaveFacts: clampList(row.mustHaveFacts, 8, 240),
    sources: clampList(row.sources, 8, 200),
    urgency,
  };
}
