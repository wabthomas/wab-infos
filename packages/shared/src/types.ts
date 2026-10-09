import type { ArticleSeoMeta } from './article-seo-meta';

export type { ArticleSeoMeta } from './article-seo-meta';

export type ArticleStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export interface StrapiMedia {
  id: number;
  url: string;
  alternativeText?: string;
  caption?: string;
  width?: number;
  height?: number;
  formats?: {
    thumbnail?: { url: string };
    small?: { url: string };
    medium?: { url: string };
    large?: { url: string };
  };
}

export interface Author {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  bio?: string;
  avatar?: StrapiMedia;
  role?: string;
  twitter?: string;
  email?: string;
}

export interface Category {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
}

export interface Tag {
  id: number;
  documentId: string;
  name: string;
  slug: string;
}

export interface Article {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: ArticleStatus;
  publishedAt: string;
  updatedAt: string;
  createdAt: string;
  featuredImage?: StrapiMedia;
  author?: Author;
  category?: Category;
  tags?: Tag[];
  isFeatured: boolean;
  isBreaking: boolean;
  isRecommended: boolean;
  viewCount: number;
  likeCount: number;
  readingTime: number;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  seoMeta?: ArticleSeoMeta;
  wpId?: number;
  wpPublishedAt?: string;
}

export interface Video {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  description?: string;
  youtubeId: string;
  type: 'live' | 'replay' | 'emission' | 'podcast';
  thumbnail?: StrapiMedia;
  publishedAt: string;
  duration?: string;
  /** Nombre de vues YouTube (API Data v3, si disponible) */
  viewCount?: number;
  show?: Show;
}

export interface Show {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: StrapiMedia;
}

export interface Comment {
  id: number;
  documentId: string;
  content: string;
  authorName: string;
  authorEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  article?: Article;
}

export interface AdPlacement {
  id: number;
  documentId: string;
  name: string;
  slot: 'header' | 'sidebar' | 'in-article' | 'footer' | 'sticky-mobile';
  adUnitId: string;
  isActive: boolean;
}

export interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiListResponse<T> {
  data: T[];
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export const CATEGORIES = [
  { name: 'Actualités RDC', slug: 'actualites-rdc', color: '#c41e3a' },
  { name: 'Politique', slug: 'politique', color: '#1d3557' },
  { name: 'Économie', slug: 'economie', color: '#1d3557' },
  { name: 'Sécurité', slug: 'securite', color: '#8b1538' },
  { name: 'Société', slug: 'societe', color: '#c41e3a' },
  { name: 'Sports', slug: 'sports', color: '#8b1538' },
  { name: 'International', slug: 'international', color: '#1d3557' },
  { name: 'Technologies', slug: 'technologies', color: '#1d3557' },
  { name: 'Wab-infos TV', slug: 'wab-infos-tv', color: '#c41e3a' },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];
