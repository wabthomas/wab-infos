'use client';

import { createContext, useContext } from 'react';
import type { SiteChromeSettings, SiteSocialLink } from '@wab-infos/shared';
import { DEFAULT_SITE_CHROME } from '@wab-infos/shared';

type SiteChromeContextValue = {
  chrome: SiteChromeSettings;
  socialLinks: SiteSocialLink[];
};

const SiteChromeContext = createContext<SiteChromeContextValue>({
  chrome: DEFAULT_SITE_CHROME,
  socialLinks: [],
});

export function SiteChromeProvider({
  chrome,
  socialLinks,
  children,
}: {
  chrome: SiteChromeSettings;
  socialLinks: SiteSocialLink[];
  children: React.ReactNode;
}) {
  return (
    <SiteChromeContext.Provider value={{ chrome, socialLinks }}>
      {children}
    </SiteChromeContext.Provider>
  );
}

export function useSiteChrome() {
  return useContext(SiteChromeContext);
}
