export type SiteLanguage = 'fr' | 'en';

export interface UserSitePreferences {
  language: SiteLanguage;
  /** Souhait d’activer les alertes push (indépendant de la permission navigateur). */
  pushAlertsDesired: boolean;
  newsletterEmail: string;
  newsletterOptIn: boolean;
}

export const USER_PREFERENCES_STORAGE_KEY = 'wab-user-site-preferences';
export const USER_PREFERENCES_EVENT = 'wab-user-preferences-changed';

export const DEFAULT_USER_PREFERENCES: UserSitePreferences = {
  language: 'fr',
  pushAlertsDesired: false,
  newsletterEmail: '',
  newsletterOptIn: false,
};

export function isSiteLanguage(value: unknown): value is SiteLanguage {
  return value === 'fr' || value === 'en';
}

export function parseUserPreferences(raw: unknown): UserSitePreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_USER_PREFERENCES };
  const data = raw as Partial<UserSitePreferences>;
  return {
    language: isSiteLanguage(data.language) ? data.language : DEFAULT_USER_PREFERENCES.language,
    pushAlertsDesired: Boolean(data.pushAlertsDesired),
    newsletterEmail:
      typeof data.newsletterEmail === 'string' ? data.newsletterEmail.trim() : '',
    newsletterOptIn: Boolean(data.newsletterOptIn),
  };
}

export function readUserPreferences(): UserSitePreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_USER_PREFERENCES };
  try {
    const raw = window.localStorage.getItem(USER_PREFERENCES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_USER_PREFERENCES };
    return parseUserPreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_USER_PREFERENCES };
  }
}

export function writeUserPreferences(prefs: UserSitePreferences): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USER_PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent(USER_PREFERENCES_EVENT, { detail: prefs }));
}

export function applyDocumentLanguage(language: SiteLanguage): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
}
