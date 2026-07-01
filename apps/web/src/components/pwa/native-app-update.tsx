'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  checkForApkUpdate,
  dismissApkUpdate,
  downloadAndInstallApkUpdate,
  isApkUpdateDismissed,
  type AppUpdateCheckResult,
} from '@wab-infos/shared/capacitor-app-update';
import { isNativeCapacitorFromUserAgent } from '@wab-infos/shared';
import { Download, Loader2, X } from 'lucide-react';

type NativeAppUpdateProps = {
  siteUrl: string;
  versionManifestUrl: string;
};

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'error';

export function NativeAppUpdate({ siteUrl, versionManifestUrl }: NativeAppUpdateProps) {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<UpdateState>('idle');
  const [check, setCheck] = useState<AppUpdateCheckResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    if (!isNativeCapacitorFromUserAgent()) return;

    setState('checking');
    const result = await checkForApkUpdate({ siteUrl, versionManifestUrl });

    if (!result.updateAvailable || !result.remote || !result.apkDownloadUrl) {
      setCheck(result);
      setState('idle');
      return;
    }

    if (isApkUpdateDismissed(result.remote.versionCode)) {
      setCheck(result);
      setState('idle');
      return;
    }

    setCheck(result);
    setState('available');
  }, [siteUrl, versionManifestUrl]);

  useEffect(() => {
    setMounted(true);
    void runCheck();

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void runCheck();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [runCheck]);

  const handleDismiss = () => {
    if (check?.remote) {
      dismissApkUpdate(check.remote.versionCode);
    }
    setState('idle');
    setError(null);
  };

  const handleUpdate = async () => {
    if (!check?.apkDownloadUrl) return;

    setState('downloading');
    setProgress(0);
    setError(null);

    try {
      await downloadAndInstallApkUpdate(check.apkDownloadUrl, setProgress);
      setState('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible');
      setState('error');
    }
  };

  if (!mounted || state === 'idle' || state === 'checking' || !check?.remote) {
    return null;
  }

  const versionLabel = check.remote.versionName;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[90] px-3 pb-3"
      role="dialog"
      aria-live="polite"
      aria-label="Mise à jour de l'application"
    >
      <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-neutral-900/95 p-4 text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C41E3A]/20 text-[#ff6b7f]">
            {state === 'downloading' ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Download className="h-5 w-5" aria-hidden />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold">Mise à jour disponible</p>
            <p className="mt-1 text-sm text-neutral-300">
              {state === 'downloading'
                ? `Téléchargement de la version ${versionLabel}…`
                : `La version ${versionLabel} est prête. Installez-la sans quitter l'application.`}
            </p>
            {check.remote.releaseNotes ? (
              <p className="mt-2 text-xs text-neutral-400">{check.remote.releaseNotes}</p>
            ) : null}
            {state === 'downloading' ? (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#C41E3A] transition-[width] duration-200"
                    style={{ width: `${Math.max(progress, 4)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-400">{progress}%</p>
              </div>
            ) : null}
            {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}

            {state !== 'downloading' ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleUpdate()}
                  className="rounded-lg bg-[#C41E3A] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#a81830]"
                >
                  Mettre à jour
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm text-neutral-200 transition hover:bg-white/5"
                >
                  Plus tard
                </button>
              </div>
            ) : null}
          </div>

          {state !== 'downloading' ? (
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 rounded-full p-1 text-neutral-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
