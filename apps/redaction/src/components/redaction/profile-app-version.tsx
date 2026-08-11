'use client';

import { useEffect, useState } from 'react';
import { getAndroidWebViewBridge, isNativeCapacitorFromUserAgent } from '@wab-infos/shared';
import { getInstalledAppVersion } from '@wab-infos/shared/capacitor-app-update';
import { fetchRedaction } from '@/lib/redaction/public-path';

type RemoteVersion = {
  versionCode?: number;
  versionName?: string;
};

export function ProfileAppVersion() {
  const [installed, setInstalled] = useState<{ versionName: string; versionCode: number } | null>(
    null
  );
  const [remote, setRemote] = useState<RemoteVersion | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    void (async () => {
      const native = await getInstalledAppVersion();
      if (native) setInstalled(native);
    })();
    void fetchRedaction('/api/redaction/apk-version', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RemoteVersion | null) => {
        if (data?.versionName) setRemote(data);
      })
      .catch(() => undefined);
  }, []);

  if (!mounted) return null;

  const isApk = Boolean(getAndroidWebViewBridge()) || isNativeCapacitorFromUserAgent();
  const versionName = installed?.versionName || remote?.versionName;
  if (!versionName) return null;

  const updateAvailable =
    isApk &&
    installed &&
    typeof remote?.versionCode === 'number' &&
    remote.versionCode > installed.versionCode;

  return (
    <p className="text-center text-[11px] font-medium text-muted-foreground">
      {isApk ? (
        <>
          APK Wab Rédaction v{installed?.versionName ?? versionName}
          {installed ? ` (${installed.versionCode})` : null}
          {updateAvailable ? ` · mise à jour ${remote?.versionName} disponible` : null}
        </>
      ) : (
        <>Dernière APK rédaction v{versionName}</>
      )}
    </p>
  );
}
