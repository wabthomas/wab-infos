const STORAGE_KEY = 'wab-infos-article-favorites';
const FAVORITES_CHANGED_EVENT = 'wab-infos-favorites-changed';

export interface SavedArticle {
  documentId: string;
  slug: string;
  title: string;
  url: string;
  categorySlug: string;
  savedAt: string;
}

function readFavorites(): SavedArticle[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedArticle[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFavorites(favorites: SavedArticle[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
}

export function getArticleFavorites(): SavedArticle[] {
  return readFavorites();
}

export function isArticleFavorite(documentId: string): boolean {
  return readFavorites().some((item) => item.documentId === documentId);
}

export function toggleArticleFavorite(
  article: Omit<SavedArticle, 'savedAt'>
): boolean {
  const favorites = readFavorites();
  const index = favorites.findIndex((item) => item.documentId === article.documentId);

  if (index >= 0) {
    favorites.splice(index, 1);
    writeFavorites(favorites);
    return false;
  }

  favorites.unshift({
    ...article,
    savedAt: new Date().toISOString(),
  });
  writeFavorites(favorites);
  return true;
}

export function subscribeToFavoritesChanges(listener: () => void): () => void {
  const handler = () => listener();
  window.addEventListener(FAVORITES_CHANGED_EVENT, handler);
  return () => window.removeEventListener(FAVORITES_CHANGED_EVENT, handler);
}
