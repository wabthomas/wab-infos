'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  applyDocumentLanguage,
  DEFAULT_USER_PREFERENCES,
  readUserPreferences,
  writeUserPreferences,
  type SiteLanguage,
  type UserSitePreferences,
  USER_PREFERENCES_EVENT,
} from '@/lib/user-preferences';

interface UserPreferencesContextValue {
  preferences: UserSitePreferences;
  setLanguage: (language: SiteLanguage) => void;
  setPushAlertsDesired: (desired: boolean) => void;
  setNewsletter: (email: string, optIn: boolean) => void;
  updatePreferences: (patch: Partial<UserSitePreferences>) => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserSitePreferences>(DEFAULT_USER_PREFERENCES);
  const [ready, setReady] = useState(false);
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;
  /** Ignore our own write echo so we don't fight concurrent patches. */
  const writingRef = useRef(false);

  useEffect(() => {
    const initial = readUserPreferences();
    preferencesRef.current = initial;
    setPreferences(initial);
    applyDocumentLanguage(initial.language);
    setReady(true);

    const onExternal = (event: Event) => {
      if (writingRef.current) return;
      const detail = (event as CustomEvent<UserSitePreferences>).detail;
      const next = detail ?? readUserPreferences();
      preferencesRef.current = next;
      setPreferences(next);
      applyDocumentLanguage(next.language);
    };

    window.addEventListener(USER_PREFERENCES_EVENT, onExternal);
    return () => window.removeEventListener(USER_PREFERENCES_EVENT, onExternal);
  }, []);

  const commit = useCallback((next: UserSitePreferences) => {
    preferencesRef.current = next;
    setPreferences(next);
    writingRef.current = true;
    writeUserPreferences(next);
    applyDocumentLanguage(next.language);
    queueMicrotask(() => {
      writingRef.current = false;
    });
  }, []);

  const updatePreferences = useCallback(
    (patch: Partial<UserSitePreferences>) => {
      commit({ ...preferencesRef.current, ...patch });
    },
    [commit]
  );

  const setLanguage = useCallback(
    (language: SiteLanguage) => updatePreferences({ language }),
    [updatePreferences]
  );

  const setPushAlertsDesired = useCallback(
    (pushAlertsDesired: boolean) => updatePreferences({ pushAlertsDesired }),
    [updatePreferences]
  );

  const setNewsletter = useCallback(
    (newsletterEmail: string, newsletterOptIn: boolean) =>
      updatePreferences({ newsletterEmail, newsletterOptIn }),
    [updatePreferences]
  );

  const value = useMemo(
    () => ({
      preferences,
      setLanguage,
      setPushAlertsDesired,
      setNewsletter,
      updatePreferences,
    }),
    [preferences, setLanguage, setPushAlertsDesired, setNewsletter, updatePreferences]
  );

  // Évite un flash de préférences par défaut avant lecture localStorage
  if (!ready) {
    return (
      <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>
    );
  }

  return (
    <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) {
    throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  }
  return ctx;
}
