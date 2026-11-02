import type { ArticleSeoMeta } from '@wab-infos/shared';

interface ArticleDraftSnapshot {
  title: string;
  excerpt: string;
  content: string;
  categoryDocumentIds: string[];
  tagNames: string[];
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  seoMeta?: ArticleSeoMeta;
  featuredImageId?: number | null;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  isBreaking: boolean;
}

interface StoredDraft {
  savedAt: number;
  values: Partial<ArticleDraftSnapshot>;
  scheduledAt?: string;
}

function storageKey(documentId?: string): string {
  const owner = typeof window !== 'undefined' ? localStorage.getItem('redaction-offline-owner') : null;
  const suffix = documentId ? `redaction-draft-${documentId}` : 'redaction-draft-new';
  return owner ? `${owner}:${suffix}` : suffix;
}

export function loadArticleDraft(documentId?: string): StoredDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(documentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed.savedAt || !parsed.values || typeof parsed.values !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveArticleDraft(
  values: ArticleDraftSnapshot,
  scheduledAt: string,
  documentId?: string
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: StoredDraft = {
      savedAt: Date.now(),
      values,
      scheduledAt,
    };
    localStorage.setItem(storageKey(documentId), JSON.stringify(payload));
  } catch {
    // quota ou mode privé
  }
}

export function clearArticleDraft(documentId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(storageKey(documentId));
    if (documentId) localStorage.removeItem(storageKey());
  } catch {
    // ignore
  }
}
