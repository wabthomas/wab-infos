const STORAGE_KEY = 'wab-infos:recent-searches';
const MAX_RECENT = 8;

export function readRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function pushRecentSearch(term: string): string[] {
  const trimmed = term.trim().replace(/\s+/g, ' ');
  if (!trimmed) return readRecentSearches();
  const next = [
    trimmed,
    ...readRecentSearches().filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, MAX_RECENT);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota / private mode
  }
  return next;
}

export function clearRecentSearches(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
