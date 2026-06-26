export type RedactionUserRole = 'author' | 'editor' | 'admin';

export interface RedactionUser {
  id: number;
  email: string;
  username: string;
  role: RedactionUserRole;
  /** Nom du rôle Strapi (users-permissions ou admin panel) */
  strapiRoleName?: string;
}

export type AdminStatsRange = 7 | 30 | 90 | 365;

export interface AdminAnalyticsPoint {
  date: string;
  value: number;
}

export interface AdminAnalyticsNamedValue {
  name: string;
  value: number;
}

export interface AdminAnalyticsSummary {
  views: number;
  /** Réservé — non utilisé (pas de données visiteurs sans GA4) */
  visitors: number;
  articles: number;
  /** Articles publiés dans la période sélectionnée */
  published: number;
  /** Total articles publiés (toutes périodes) */
  publishedTotal: number;
  comments: number;
  subscribers: number;
  pushSubscribers: number;
  pendingComments: number;
  /** En attente de modération — toutes périodes, hors filtre de dates */
}

export interface AdminAnalytics {
  range: { days: AdminStatsRange; from: string; to: string };
  summary: AdminAnalyticsSummary;
  traffic: AdminAnalyticsPoint[];
  trends: {
    views: AdminAnalyticsPoint[];
    articles: AdminAnalyticsPoint[];
    comments: AdminAnalyticsPoint[];
  };
  subscribers: {
    active: number;
    unsubscribed: number;
    growth: AdminAnalyticsPoint[];
    sources: AdminAnalyticsNamedValue[];
  };
  referrers: AdminAnalyticsNamedValue[];
  countries: AdminAnalyticsNamedValue[];
  topArticles: {
    documentId: string;
    title: string;
    views: number;
    category?: string;
    publishedAt?: string;
  }[];
  topCategories: AdminAnalyticsNamedValue[];
  comments: {
    pending: number;
    approved: number;
    rejected: number;
    timeline: AdminAnalyticsPoint[];
  };
  dataSources: {
    viewsEstimated: boolean;
    geoEstimated: boolean;
  };
}

export interface RedactionAuthor {
  documentId: string;
  name: string;
  slug: string;
}

export interface RedactionCategory {
  documentId: string;
  name: string;
  slug: string;
  color?: string;
}

export interface RedactionArticle {
  documentId: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  isBreaking: boolean;
  isFeatured: boolean;
  viewCount: number;
  readingTime: number;
  publishedAt?: string;
  wpPublishedAt?: string;
  scheduledAt?: string;
  updatedAt: string;
  category?: RedactionCategory;
  secondaryCategories?: RedactionCategory[];
  tagNames?: string[];
  featuredImage?: { id: number; url: string; alternativeText?: string };
  author?: RedactionAuthor;
}

export interface RedactionStats {
  totalArticles: number;
  publishedCount: number;
  draftCount: number;
  scheduledCount: number;
  totalViews: number;
  breakingCount: number;
}

export interface RedactionComment {
  documentId: string;
  content: string;
  authorName: string;
  authorEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  article?: {
    documentId: string;
    title: string;
    slug: string;
    category?: { slug: string };
  };
}

export interface ArticleEditorPayload {
  title: string;
  excerpt: string;
  content: string;
  categoryDocumentIds: string[];
  tagNames?: string[];
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  featuredImageId?: number | null;
  isBreaking?: boolean;
  publish?: boolean;
  scheduledAt?: string | null;
  /** Sauvegarde automatique — ne jamais publier ni planifier */
  draftOnly?: boolean;
  /** Publication — attribuer à un autre rédacteur (admin uniquement) */
  authorDocumentId?: string | null;
}

export interface FcmSubscriptionPayload {
  fcmToken: string;
}

export interface RedactionMediaItem {
  id: number;
  url: string;
  previewUrl?: string;
  name: string;
  alternativeText?: string | null;
  caption?: string | null;
  width?: number;
  height?: number;
  mime: string;
  createdAt?: string;
}
