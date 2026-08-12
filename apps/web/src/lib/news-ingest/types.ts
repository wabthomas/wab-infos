export type NewsSourceId =
  | 'radio-okapi'
  | 'actualite-cd'
  | '7sur7'
  | 'le-potentiel'
  | 'opinion-info';

export interface NewsSourceConfig {
  id: NewsSourceId;
  name: string;
  homeUrl: string;
  rssUrls: string[];
  enabled: boolean;
}

export interface DiscoveredItem {
  url: string;
  title?: string;
  publishedAt?: string;
  categoryHint?: string;
}

export interface ParsedArticle {
  title: string;
  html: string;
  excerpt: string;
  imageUrl?: string;
  imageAlt?: string;
  sourceName: string;
  sourceUrl: string;
  sourceId: NewsSourceId;
  publishedAt?: string;
  categoryGuess: string;
}

export interface IngestSourceResult {
  sourceId: NewsSourceId;
  discovered: number;
  created: number;
  skipped: number;
  errors: string[];
  underQuota: boolean;
}

export interface IngestRunResult {
  ok: boolean;
  quotaPerSource: number;
  maxPerRun: number;
  sources: IngestSourceResult[];
  createdTotal: number;
}
