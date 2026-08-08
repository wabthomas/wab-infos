/** Compte lecteur local (navigateur) — e-mail + nom d’affichage. */

export interface ReaderAccount {
  email: string;
  displayName: string;
  createdAt: string;
}

export const READER_ACCOUNT_STORAGE_KEY = 'wab-reader-account';
export const READER_ACCOUNT_EVENT = 'wab-reader-account-changed';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function parseReaderAccount(raw: unknown): ReaderAccount | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const email = typeof row.email === 'string' ? row.email.trim().toLowerCase() : '';
  const displayName = typeof row.displayName === 'string' ? row.displayName.trim() : '';
  const createdAt =
    typeof row.createdAt === 'string' && row.createdAt.trim()
      ? row.createdAt.trim()
      : new Date().toISOString();
  if (!isValidEmail(email) || !displayName) return null;
  return { email, displayName, createdAt };
}

export function readReaderAccount(): ReaderAccount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(READER_ACCOUNT_STORAGE_KEY);
    if (!raw) return null;
    return parseReaderAccount(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeReaderAccount(account: ReaderAccount): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(READER_ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  window.dispatchEvent(new CustomEvent(READER_ACCOUNT_EVENT, { detail: account }));
}

export function clearReaderAccount(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(READER_ACCOUNT_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(READER_ACCOUNT_EVENT, { detail: null }));
}

export function loginReaderAccount(input: {
  email: string;
  displayName: string;
}): { ok: true; account: ReaderAccount } | { ok: false; error: string } {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  if (!displayName) {
    return { ok: false, error: 'Indiquez un nom d’affichage.' };
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: 'Adresse e-mail invalide.' };
  }
  const existing = readReaderAccount();
  const account: ReaderAccount = {
    email,
    displayName,
    createdAt: existing?.email === email ? existing.createdAt : new Date().toISOString(),
  };
  writeReaderAccount(account);
  return { ok: true, account };
}

export function subscribeToReaderAccount(
  listener: (account: ReaderAccount | null) => void
): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => listener(readReaderAccount());
  window.addEventListener(READER_ACCOUNT_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(READER_ACCOUNT_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
