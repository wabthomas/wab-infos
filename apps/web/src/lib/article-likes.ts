const STORAGE_KEY = 'wab-infos-article-likes';
const LIKES_CHANGED_EVENT = 'wab-infos-likes-changed';

function readLikedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

function writeLikedIds(ids: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, 500)));
  window.dispatchEvent(new Event(LIKES_CHANGED_EVENT));
}

export function isArticleLiked(documentId: string): boolean {
  return readLikedIds().includes(documentId);
}

/** Enregistre localement le like / unlike (sans appeler l’API). */
export function setArticleLikedLocally(documentId: string, liked: boolean): void {
  const ids = readLikedIds();
  const index = ids.indexOf(documentId);
  if (liked && index === -1) {
    ids.unshift(documentId);
    writeLikedIds(ids);
    return;
  }
  if (!liked && index >= 0) {
    ids.splice(index, 1);
    writeLikedIds(ids);
  }
}

export function subscribeToLikesChanges(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener(LIKES_CHANGED_EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(LIKES_CHANGED_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}
