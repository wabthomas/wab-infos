'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  checkForApkUpdate,
  downloadAndInstallApkUpdate,
  usesNativeAndroidUpdateBridge,
  type AppUpdateCheckResult,
} from '@wab-infos/shared/capacitor-app-update';
import { getAndroidWebViewBridge, isNativeCapacitorFromUserAgent, isNativeRedactionAppFromUserAgent } from '@wab-infos/shared';
import { ArrowRight, Download, Loader2, Smartphone, X } from 'lucide-react';
import { redactionPublicPath } from '@/lib/redaction/public-path';
import { APK_INSTALL_WAIT_MS, APK_SNOOZE_MS, apkBannerStamp, isApkBannerTemporarilyHidden } from '@/lib/redaction/apk-update-banner';

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'error';
const SNOOZE_KEY = 'wab-redaction-apk-snoozed-v1';
const INSTALL_STARTED_KEY = 'wab-redaction-apk-install-started-v1';

function readLocal(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeLocal(key: string, value: string | null) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* L'APK reste utilisable même sans stockage local. */ }
}

/** N'apparaît que dans l'APK, après comparaison du code installé avec le manifeste officiel. */
export function NativeAppUpdate({ siteUrl }: { siteUrl: string }) {
  const [state, setState] = useState<UpdateState>('idle');
  const [check, setCheck] = useState<AppUpdateCheckResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const checking = useRef(false), installing = useRef(false);

  const runCheck = useCallback(async () => {
    // Un lecteur Wab-infos ouvert sur la rédaction ne doit jamais recevoir l'APK Rédaction.
    const nativeRedaction = isNativeRedactionAppFromUserAgent() ||
      (!isNativeCapacitorFromUserAgent() && Boolean(getAndroidWebViewBridge()?.getAppVersionJson));
    if (!nativeRedaction || checking.current || installing.current) return;
    checking.current = true;
    setState(previous => previous === 'idle' ? 'checking' : previous);
    try {
      // Le proxy même origine respecte aussi le basePath /redaction des APK hébergées sous ce chemin.
      const manifestUrl = `${window.location.origin}${redactionPublicPath('/api/redaction/apk-version')}`;
      const result = await checkForApkUpdate({ siteUrl, versionManifestUrl: manifestUrl });
      if (installing.current) return;
      setCheck(result);
      if (!result.updateAvailable || !result.remote || !result.apkDownloadUrl) { setState('idle'); return; }
      const code = result.remote.versionCode;
      if (result.installed && result.installed.versionCode >= code) {
        writeLocal(INSTALL_STARTED_KEY, null);
        writeLocal(SNOOZE_KEY, null);
        setState('idle'); return;
      }
      if (isApkBannerTemporarilyHidden(code, readLocal(SNOOZE_KEY), APK_SNOOZE_MS) ||
          isApkBannerTemporarilyHidden(code, readLocal(INSTALL_STARTED_KEY), APK_INSTALL_WAIT_MS)) {
        setState('idle'); return;
      }
      setState('available');
    } catch { setState('idle'); }
    finally { checking.current = false; }
  }, [siteUrl]);

  useEffect(() => {
    void runCheck();
    const onVisible = () => { if (document.visibilityState === 'visible') void runCheck(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [runCheck]);

  useEffect(() => {
    const onProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ percent?: number }>).detail;
      if (typeof detail?.percent === 'number') setProgress(Math.max(0, Math.min(100, Math.round(detail.percent))));
    };
    const onInstalling = () => { setProgress(100); setState('installing'); };
    window.addEventListener('wab-apk-download-progress', onProgress);
    window.addEventListener('wab-apk-installing', onInstalling);
    return () => {
      window.removeEventListener('wab-apk-download-progress', onProgress);
      window.removeEventListener('wab-apk-installing', onInstalling);
    };
  }, []);

  function dismiss() {
    if (check?.remote) writeLocal(SNOOZE_KEY, apkBannerStamp(check.remote.versionCode));
    setState('idle'); setError('');
  }

  async function update() {
    if (!check?.remote || !check.apkDownloadUrl) return;
    writeLocal(INSTALL_STARTED_KEY, apkBannerStamp(check.remote.versionCode));
    setError('');
    const bridge = getAndroidWebViewBridge();
    try {
      // Téléchargement + installation par le navigateur (Chrome), comme une mise à jour standard.
      if (bridge?.openExternalUrl) bridge.openExternalUrl(check.apkDownloadUrl);
      else if (usesNativeAndroidUpdateBridge()) await downloadAndInstallApkUpdate(check.apkDownloadUrl, setProgress);
      else window.open(check.apkDownloadUrl, '_blank', 'noopener,noreferrer');
      setState('idle');
    } catch (cause) {
      writeLocal(INSTALL_STARTED_KEY, null);
      setError(cause instanceof Error ? cause.message : 'Ouverture du navigateur impossible. Réessayez.');
      setState('error');
    }
  }

  if (state === 'idle' || state === 'checking' || !check?.remote) return null;
  const current = check.installed?.versionName ?? '—', latest = check.remote.versionName;
  return <aside role="region" aria-label="Mise à jour APK Rédaction" aria-live="polite" className="fixed inset-x-0 bottom-0 z-[90] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-5">
    <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[#b8d3eb] bg-white text-[#123655] shadow-[0_14px_50px_rgba(4,36,73,0.3)] dark:border-[#4a688b] dark:bg-[#14243c] dark:text-white">
      <div className="h-1 bg-gradient-to-r from-[#0a447e] via-[#1676bc] to-[#ef008c]" />
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0c4b87]/10 text-[#0c4b87] dark:bg-white/10 dark:text-white">
          {state === 'downloading' ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Smartphone className="h-5 w-5" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Mise à jour APK Rédaction disponible</p>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">Version {current} <ArrowRight className="h-3.5 w-3.5" aria-hidden /> {latest}</p>
          {check.remote.releaseNotes && <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{check.remote.releaseNotes}</p>}
        </div>
        {state !== 'downloading' && state !== 'installing' && <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => void update()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0b4e8b] px-4 py-2 text-xs font-bold text-white hover:bg-[#083e71]"><Download className="h-4 w-4" aria-hidden />Mettre à jour</button>
          <button type="button" onClick={dismiss} aria-label="Plus tard : rappeler demain" title="Plus tard" className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>}
      </div>
      {(state === 'downloading' || state === 'installing') && <div className="px-4 pb-3 sm:px-5"><div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Téléchargement de l'APK" className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className={`h-full bg-[#1273b4] transition-[width] ${state === 'installing' ? 'animate-pulse' : ''}`} style={{width:`${state === 'installing' ? 100 : Math.max(2,progress)}%`}} /></div><p className="mt-1 text-xs">{state === 'installing' ? 'Ouverture de l’installation Android…' : `Téléchargement… ${progress}%`}</p></div>}
      {error && <p role="alert" className="px-4 pb-3 text-xs text-red-700 dark:text-red-300 sm:px-5">{error}</p>}
    </div>
  </aside>;
}
