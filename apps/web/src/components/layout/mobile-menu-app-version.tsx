'use client';

import { useEffect, useState } from 'react';
import { siteConfig } from '@/config/site';

export function MobileMenuAppVersion() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(siteConfig.androidApkVersionUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { versionName?: string } | null) => {
        if (cancelled || !data?.versionName) return;
        setLabel(`Application v${data.versionName}`);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!label) return null;

  return (
    <p className="border-t border-border px-5 py-3 text-center text-[11px] font-medium text-muted-foreground">
      {label}
    </p>
  );
}
