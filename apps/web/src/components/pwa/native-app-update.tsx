'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  checkForApkUpdate,
  dismissApkUpdate,
  downloadAndInstallApkUpdate,
  isApkUpdateDismissed,
  usesNativeAndroidUpdateBridge,
  type AppUpdateCheckResult,
} from '@wab-infos/shared/capacitor-app-update';
import { isNativeCapacitorFromUserAgent } from '@wab-infos/shared';
import { ArrowRight, Download, Loader2, Sparkles, X } from 'lucide-react';

type NativeAppUpdateProps = {
  siteUrl: string;
  versionManifestUrl: string;
};

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'error';

const APK_INSTALL_STARTED_KEY = 'wab-apk-install-started-code';

export function NativeAppUpdate({ siteUrl, versionManifestUrl }: NativeAppUpdateProps) {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<UpdateState>('idle');
  const [check, setCheck] = useState<AppUpdateCheckResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clearInstallStartedIfUpdated = useCallback((result: AppUpdateCheckResult) => {
    if (typeof localStorage === 'undefined' || !result.installed) return;
    const startedRaw = localStorage.getItem(APK_INSTALL_STARTED_KEY);
    const startedCode = startedRaw ? Number.parseInt(startedRaw, 10) : 0;
    if (startedCode > 0 && result.installed.versionCode >= startedCode) {
      localStorage.removeItem(APK_INSTALL_STARTED_KEY);
      dismissApkUpdate(startedCode);
    }
  }, []);

  const runCheck = useCallback(async () => {
    if (!isNativeCapacitorFromUserAgent()) return;

    setState('checking');
    const result = await checkForApkUpdate({ siteUrl, versionManifestUrl });
    clearInstallStartedIfUpdated(result);

    if (!result.updateAvailable || !result.remote || !result.apkDownloadUrl) {
      setCheck(result);
      setState('idle');
      return;
    }

    // Après « Mettre à jour », on masque le bandeau jusqu'à ce que la version change
    // (évite la répétition quand on revient de l'écran d'installation).
    if (typeof localStorage !== 'undefined') {
      const startedRaw = localStorage.getItem(APK_INSTALL_STARTED_KEY);
      const startedCode = startedRaw ? Number.parseInt(startedRaw, 10) : 0;
      if (startedCode === result.remote.versionCode) {
        setCheck(result);
        setState('idle');
        return;
      }
    }

    if (isApkUpdateDismissed(result.remote.versionCode)) {
      setCheck(result);
      setState('idle');
      return;
    }

    setCheck(result);
    setState('available');
  }, [clearInstallStartedIfUpdated, siteUrl, versionManifestUrl]);

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
    if (!check?.apkDownloadUrl || !check.remote) return;

    setError(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(APK_INSTALL_STARTED_KEY, String(check.remote.versionCode));
    }

    if (usesNativeAndroidUpdateBridge()) {
      setState('downloading');
      setProgress(100);
      try {
        await downloadAndInstallApkUpdate(check.apkDownloadUrl, setProgress);
        // Masque le bandeau : l'install système prend le relais.
        setState('idle');
      } catch (err) {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(APK_INSTALL_STARTED_KEY);
        }
        setError(err instanceof Error ? err.message : 'Mise à jour impossible');
        setState('error');
      }
      return;
    }

    setState('downloading');
    setProgress(0);

    try {
      await downloadAndInstallApkUpdate(check.apkDownloadUrl, setProgress);
      setState('idle');
    } catch (err) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(APK_INSTALL_STARTED_KEY);
      }
      setError(err instanceof Error ? err.message : 'Mise à jour impossible');
      setState('error');
    }
  };

  if (!mounted || state === 'idle' || state === 'checking' || !check?.remote) {
    return null;
  }

  const installedLabel = check.installed?.versionName ?? '—';
  const remoteLabel = check.remote.versionName;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[90] px-3 pb-3 sm:px-4 sm:pb-4"
      role="dialog"
      aria-live="polite"
      aria-label="Mise à jour de l'application"
    >
      <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-[#C41E3A]/20 bg-white text-neutral-900 shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
        <div className="bg-gradient-to-br from-[#C41E3A] to-[#8B1538] px-4 py-4 text-white sm:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              {state === 'downloading' ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-5 w-5" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold tracking-tight">Nouvelle version disponible</p>
              <p className="mt-1 text-sm text-white/85">
                Installez la dernière version pour profiter des améliorations récentes.
              </p>
            </div>
            {state !== 'downloading' ? (
              <button
                type="button"
                onClick={handleDismiss}
                className="shrink-0 rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-center gap-3 rounded-xl bg-neutral-50 px-4 py-3">
            <div className="text-center">
              <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                Actuelle
              </p>
              <p className="mt-0.5 text-sm font-semibold text-neutral-700">v{installedLabel}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-[#C41E3A]" aria-hidden />
            <div className="text-center">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#C41E3A]">
                Nouvelle
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#C41E3A]">v{remoteLabel}</p>
            </div>
          </div>

          {check.remote.releaseNotes ? (
            <p className="text-sm leading-relaxed text-neutral-600">{check.remote.releaseNotes}</p>
          ) : (
            <p className="text-sm leading-relaxed text-neutral-600">
              Corrections, performances et nouveautés — l&apos;installation se fait sans quitter
              l&apos;application.
            </p>
          )}

          {state === 'downloading' ? (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#C41E3A] to-[#8B1538] transition-[width] duration-200"
                  style={{ width: `${Math.max(progress, 8)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                {usesNativeAndroidUpdateBridge()
                  ? `Installation de la version ${remoteLabel}…`
                  : `Téléchargement de la version ${remoteLabel}… ${progress}%`}
              </p>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {state !== 'downloading' ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => void handleUpdate()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#C41E3A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#a81830] sm:flex-none"
              >
                <Download className="h-4 w-4" aria-hidden />
                Mettre à jour
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
              >
                Plus tard
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
