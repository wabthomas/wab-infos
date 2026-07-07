'use client';

import { createContext, useContext } from 'react';
import type { AdsenseConfig } from '@/lib/adsense-config.server';
import { siteConfig } from '@/config/site';

const fallbackConfig: AdsenseConfig = {
  client: siteConfig.adsenseClient,
  slots: { ...siteConfig.adsenseSlots },
};

const AdsenseConfigContext = createContext<AdsenseConfig>(fallbackConfig);

export function AdsenseConfigProvider({
  config,
  children,
}: {
  config: AdsenseConfig;
  children: React.ReactNode;
}) {
  return (
    <AdsenseConfigContext.Provider value={config}>{children}</AdsenseConfigContext.Provider>
  );
}

export function useAdsenseConfig(): AdsenseConfig {
  return useContext(AdsenseConfigContext);
}
