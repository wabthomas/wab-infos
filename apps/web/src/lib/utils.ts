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

function parseValidDate(date?: string | null): Date | null {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatRelativeDate(date: string | Date) {
  return formatArticleDate(date);
}

/**
 * Date de publication stable — ne jamais utiliser updatedAt (change à chaque vue/modif CMS).
 * wpPublishedAt = import WordPress ; publishedAt = Strapi draft & publish.
 * On prend la plus ancienne des deux pour éviter un publishedAt rafraîchi par erreur.
 */
export function getArticleDisplayDate(article: {
  publishedAt?: string | null;
  wpPublishedAt?: string | null;
  scheduledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
}): string {
  const publicationDates = [article.wpPublishedAt, article.publishedAt]
    .map(parseValidDate)
    .filter((d): d is Date => d !== null);

  if (publicationDates.length) {
    return new Date(Math.min(...publicationDates.map((d) => d.getTime()))).toISOString();
  }

  if (article.status === 'scheduled' && article.scheduledAt) {
    return article.scheduledAt;
  }

  return article.createdAt || article.updatedAt || new Date(0).toISOString();
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
 * Date lisible et stable pour l'affichage :
 * - < 1 h → relatif court
 * - même jour / hier → heure fixe (« Aujourd'hui à 14:32 »)
 * - plus ancien → date complète
 */
export function formatArticleDate(date: string | Date): string {
  const target = parseValidDate(typeof date === 'string' ? date : date.toISOString());
  if (!target) return '';

  const now = new Date();
  const diffMs = now.getTime() - target.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 0) {
    return formatDate(target, { day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;

  const todayStart = startOfLocalDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const timeLabel = formatTime(target);

  if (target >= todayStart) return `Aujourd'hui à ${timeLabel}`;
  if (target >= yesterdayStart) return `Hier à ${timeLabel}`;

  const diffDays = Math.floor(diffMinutes / (60 * 24));
  if (diffDays < 7) return `Il y a ${diffDays} j`;

  if (target.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(target);
  }

  return formatDate(target, {
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

/** Échappe les caractères réservés HTML dans du texte brut. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      const body = escapeHtml(trimmed).replace(/\n/g, '<br>');
      return `<p>${body}</p>`;
    })
    .filter(Boolean)
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

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Extrait le texte du premier paragraphe HTML (ou du contenu brut). */
export function firstParagraphFromHtml(html: string): string {
  if (!html?.trim()) return '';
  const paragraphMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (paragraphMatch) return stripHtml(paragraphMatch[1]);
  return stripHtml(html);
}

function firstSentence(text: string): string {
  const match = text.match(/^(.+?[.!?…])(?:\s|$)/u);
  return match ? match[1].trim() : text.trim();
}

function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.55) return slice.slice(0, lastSpace).trim();
  return slice.trim();
}

/**
 * Titre SEO accrocheur : titre de l’article enrichi par l’accroche du premier paragraphe.
 */
export function generateSeoTitle(title: string, content: string, maxLength = 70): string {
  const cleanTitle = title.trim();
  const firstPara = firstParagraphFromHtml(content);

  if (!cleanTitle) return truncateAtWord(firstPara, maxLength);
  if (!firstPara) return truncateAtWord(cleanTitle, maxLength);

  if (cleanTitle.length >= 55) return truncateAtWord(cleanTitle, maxLength);

  const hook = firstSentence(firstPara);
  const titlePrefix = cleanTitle.toLowerCase().slice(0, Math.min(28, cleanTitle.length));
  if (titlePrefix && hook.toLowerCase().startsWith(titlePrefix)) {
    return truncateAtWord(cleanTitle, maxLength);
  }

  const separator = ' — ';
  const hookBudget = maxLength - cleanTitle.length - separator.length;
  if (hookBudget < 12) return truncateAtWord(cleanTitle, maxLength);

  const hookPart = truncateAtWord(hook, hookBudget);
  return `${cleanTitle}${separator}${hookPart}`.slice(0, maxLength);
}

/** Description SEO : texte du premier paragraphe, tronqué pour les réseaux. */
export function generateSeoDescription(content: string, maxLength = 160): string {
  const firstPara = firstParagraphFromHtml(content);
  if (!firstPara) return '';
  if (firstPara.length <= maxLength) return firstPara;
  return `${truncateAtWord(firstPara, maxLength - 1)}…`;
}

/** Extrait les N premiers caractères du texte brut (sans balises HTML). */
export function excerptFromContent(html: string, maxLength = 170): string {
  const plain = stripHtml(html);
  if (!plain) return '';
  return plain.length <= maxLength ? plain : plain.slice(0, maxLength).trim();
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
