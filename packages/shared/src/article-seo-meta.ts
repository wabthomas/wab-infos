/** Métadonnées SEO avancées par article (champ JSON `seoMeta`). */

export type ArticleSchemaType = 'NewsArticle' | 'Article' | 'BlogPosting';

export interface ArticleSeoMeta {
  focusKeyphrase: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  ogTitle: string;
  ogDescription: string;
  schemaType: ArticleSchemaType;
  breadcrumbTitle: string;
}

export const DEFAULT_ARTICLE_SEO_META: ArticleSeoMeta = {
  focusKeyphrase: '',
  robotsIndex: true,
  robotsFollow: true,
  ogTitle: '',
  ogDescription: '',
  schemaType: 'NewsArticle',
  breadcrumbTitle: '',
};

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asSchemaType(value: unknown): ArticleSchemaType {
  if (value === 'Article' || value === 'BlogPosting' || value === 'NewsArticle') return value;
  return 'NewsArticle';
}

export function normalizeArticleSeoMeta(raw: unknown): ArticleSeoMeta {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_ARTICLE_SEO_META };
  }
  const row = raw as Record<string, unknown>;
  return {
    focusKeyphrase: asString(row.focusKeyphrase).slice(0, 120),
    robotsIndex: asBool(row.robotsIndex, true),
    robotsFollow: asBool(row.robotsFollow, true),
    ogTitle: asString(row.ogTitle).slice(0, 70),
    ogDescription: asString(row.ogDescription).slice(0, 200),
    schemaType: asSchemaType(row.schemaType),
    breadcrumbTitle: asString(row.breadcrumbTitle).slice(0, 80),
  };
}
