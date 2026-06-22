import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { StrapiMedia } from '@wab-infos/shared';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeDate(date: string | Date) {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  return formatDate(date);
}

/** Date de publication effective (WordPress ou Strapi), quelle que soit l'année. */
export function getArticleDisplayDate(article: {
  publishedAt?: string;
  wpPublishedAt?: string;
  scheduledAt?: string;
  updatedAt?: string;
}): string {
  if (article.scheduledAt) return article.scheduledAt;
  return article.wpPublishedAt || article.publishedAt || article.updatedAt || new Date().toISOString();
}

export function getArticleTimestamp(article: {
  publishedAt: string;
  wpPublishedAt?: string;
}): number {
  return new Date(getArticleDisplayDate(article)).getTime();
}

export function compareArticlesByDateDesc(
  a: { publishedAt: string; wpPublishedAt?: string },
  b: { publishedAt: string; wpPublishedAt?: string }
): number {
  return getArticleTimestamp(b) - getArticleTimestamp(a);
}

/**
 * Date lisible pour l'affichage :
 * - publication récente (< 48 h) → forme relative (« Il y a 2 h »)
 * - plus ancienne (2020, 2023, 2024, etc.) → date complète avec année
 */
export function formatArticleDate(date: string | Date): string {
  const target = new Date(date);
  const diffHours = (Date.now() - target.getTime()) / (1000 * 60 * 60);

  if (diffHours < 48) {
    return formatRelativeDate(date);
  }

  return formatDate(date, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const text = content.replace(/<[^>]*>/g, '');
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function rewriteWordPressContent(html: string): string {
  return html.replace(
    /https?:\/\/wab-infos\.com\/wp-content\/uploads\//gi,
    '/wp-content/uploads/'
  );
}

/** Convertit le texte brut (retours à la ligne) en HTML pour l'affichage article. */
export function formatArticleContent(content: string): string {
  const rewritten = rewriteWordPressContent(content);
  if (!rewritten.trim()) return '';

  if (/<(?:p|div|h[1-6]|ul|ol|blockquote|figure)\b/i.test(rewritten)) {
    return rewritten;
  }

  return rewritten
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>').trim()}</p>`)
    .filter((p) => p !== '<p></p>')
    .join('');
}

export function getStrapiMediaUrl(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  // Proxy Next.js : app.wab-infos.com/uploads → Strapi
  return url.startsWith('/') ? url : `/${url}`;
}

/** URL nette pour l’affichage (évite les miniatures Strapi ~150px). */
export function resolveArticleImageUrl(
  image?: StrapiMedia | null,
  size: 'hero' | 'card' = 'card'
): string | null {
  if (!image?.url) return null;

  const { formats, url } = image;
  let src = url;

  if (size === 'hero') {
    src = formats?.large?.url || url;
  } else {
    src = formats?.medium?.url || formats?.large?.url || url;
  }

  return getStrapiMediaUrl(src);
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '…';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
