interface ArticleDraftSnapshot {
  title: string;
  excerpt: string;
  content: string;
  categoryDocumentIds: string[];
  tagNames: string[];
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  featuredImageId?: number | null;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  isBreaking: boolean;
}

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredDraft {
  savedAt: number;
  values: Partial<ArticleDraftSnapshot>;
  scheduledAt?: string;
}

function storageKey(documentId?: string): string {
  return documentId ? `redaction-draft-${documentId}` : 'redaction-draft-new';
}

export function loadArticleDraft(documentId?: string): StoredDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(documentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(storageKey(documentId));
      return null;
    }
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
