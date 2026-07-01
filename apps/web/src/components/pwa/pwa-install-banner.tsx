'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { Download, ExternalLink, Smartphone, X } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { PWA_INSTALL_DISMISS } from '@/lib/pwa/constants';
import {
  detectInstalledPwa,
  isIosDevice,
  isStandalonePwa,
  markPwaInstalled,
  needsSafariForIosInstall,
  shouldHideInstallBanner,
  type PwaVariant,
} from '@/lib/pwa/detect';
import { isAndroidDevice, isNativeCapacitorApp, isNativeCapacitorFromUserAgent } from '@wab-infos/shared';

interface PwaInstallBannerProps {
  variant: PwaVariant;
  /** fixed = bandeau flottant site ; inline = dans le flux (login rédaction) */
  placement?: 'fixed' | 'inline';
  /** banner = panneau visible ; fab = bouton flottant qui ouvre le panneau */
  display?: 'banner' | 'fab';
  /** Délai avant affichage du bouton fab (ms) */
  showAfterMs?: number;
}

/** Événement Chrome / Edge pour l’installation PWA */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const COPY = {
  site: {
    title: 'Installer Wab-infos',
    subtitle: 'Notifications en direct et accès rapide à l’actualité.',
    androidTitle: 'Installer Wab-infos',
    androidSubtitle: 'Choisissez l’application web (PWA) ou l’APK Android.',
    iosTitle: 'Ajouter Wab-infos à l’écran d’accueil',
  },
  redaction: {
    title: 'Installer l’app rédaction',
    subtitle: 'Publiez depuis votre mobile en un geste.',
    androidTitle: 'Installer l’app Wab-infos',
    androidSubtitle: 'Notifications rédaction et publication depuis votre mobile.',
    iosTitle: 'Ajouter l’app rédaction à l’écran d’accueil',
  },
} as const;

const APP_ICON = '/icons/icon-192.png';

function DismissButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 text-muted-foreground" aria-label="Fermer">
      <X className="h-4 w-4" />
    </button>
  );
}

function AppLogo({ size = 48 }: { size?: number }) {
  return (
    <Image
      src={APP_ICON}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full ring-2 ring-primary/20"
      aria-hidden
    />
  );
}

function AndroidSiteInstallBanner({
  labels,
  apkUrl,
  onDismiss,
  pwaEnabled = true,
  apkEnabled = true,
}: {
  labels: Pick<(typeof COPY)['site'], 'androidTitle' | 'androidSubtitle'>;
  apkUrl: string;
  onDismiss: () => void;
  pwaEnabled?: boolean;
  apkEnabled?: boolean;
}) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pwaHint, setPwaHint] = useState(false);
  const [installingPwa, setInstallingPwa] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setPwaHint(false);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installPwa = useCallback(async () => {
    if (!installPrompt) {
      setPwaHint(true);
      return;
    }

    setInstallingPwa(true);
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        markPwaInstalled('site');
        onDismiss();
      }
      setInstallPrompt(null);
    } catch {
      setPwaHint(true);
    } finally {
      setInstallingPwa(false);
    }
  }, [installPrompt, onDismiss]);

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <AppLogo />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{labels.androidTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{labels.androidSubtitle}</p>
        </div>
        <DismissButton onClick={onDismiss} />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {pwaEnabled ? (
          <button
            type="button"
            onClick={() => void installPwa()}
            disabled={installingPwa}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {installingPwa ? 'Installation…' : 'Installer l’app (PWA)'}
          </button>
        ) : null}

        {apkEnabled && apkUrl ? (
          <a
            href={apkUrl}
            download
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground"
          >
            <Download className="h-4 w-4" />
            Télécharger l’APK
          </a>
        ) : null}

        {pwaEnabled && pwaHint ? (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            Dans Chrome : menu <strong className="text-foreground">⋮</strong> →{' '}
            <strong className="text-foreground">Installer l&apos;application</strong> ou{' '}
            <strong className="text-foreground">Ajouter à l&apos;écran d&apos;accueil</strong>.
          </p>
        ) : null}

        {apkEnabled && apkUrl ? (
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            APK : autorisez l&apos;installation depuis cette source si Android le demande.
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="mt-3 w-full text-center text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
      >
        Continuer sur le site
      </button>
    </div>
  );
}

export function PwaInstallBanner({
  variant,
  placement = 'inline',
  display = 'banner',
  showAfterMs = 3000,
}: PwaInstallBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [installCheckDone, setInstallCheckDone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [inNativeApp, setInNativeApp] = useState(false);
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [android, setAndroid] = useState(false);
  const [needsSafari, setNeedsSafari] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fabVisible, setFabVisible] = useState(display !== 'fab');
  const [fabOpen, setFabOpen] = useState(false);
  const [siteBanner, setSiteBanner] = useState<{
    pwaBannerEnabled: boolean;
    pwaBannerVisible: boolean;
    apkBannerEnabled: boolean;
    apkBannerVisible: boolean;
  } | null>(null);

  const dismissKey = PWA_INSTALL_DISMISS[variant];
  const labels = COPY[variant];
  const apkUrl = siteConfig.androidApkUrl;

  useEffect(() => {
    if (variant !== 'site') return;
    void fetch('/api/site-settings', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data === 'object') {
          setSiteBanner({
            pwaBannerEnabled: data.pwaBannerEnabled !== false,
            pwaBannerVisible: data.pwaBannerVisible !== false,
            apkBannerEnabled: data.apkBannerEnabled !== false,
            apkBannerVisible: data.apkBannerVisible !== false,
          });
        }
      })
      .catch(() => {
        // défauts = tout activé
      });
  }, [variant]);

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(dismissKey) === '1') setDismissed(true);
    } catch {
      // ignore
    }

    if (shouldHideInstallBanner(variant)) {
      setAlreadyInstalled(true);
      setInstallCheckDone(true);
      return;
    }

    void (async () => {
      try {
        if (await isNativeCapacitorApp()) {
          setInNativeApp(true);
          return;
        }

        const installed = await detectInstalledPwa();
        if (installed) {
          markPwaInstalled(variant);
          setAlreadyInstalled(true);
          return;
        }

        if (isIosDevice()) {
          setIos(true);
          setNeedsSafari(needsSafariForIosInstall());
          return;
        }

        if (isAndroidDevice()) {
          setAndroid(true);
        }
      } finally {
        setInstallCheckDone(true);
      }
    })();
  }, [dismissKey, variant]);

  useEffect(() => {
    if (display !== 'fab' || !installCheckDone || dismissed) return;

    const timer = window.setTimeout(() => setFabVisible(true), showAfterMs);
    return () => window.clearTimeout(timer);
  }, [display, installCheckDone, dismissed, showAfterMs]);

  function dismiss() {
    setDismissed(true);
    setFabOpen(false);
    try {
      sessionStorage.setItem(dismissKey, '1');
    } catch {
      // ignore
    }
  }

  async function copyPageLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  const bannerFlags = siteBanner ?? {
    pwaBannerEnabled: true,
    pwaBannerVisible: true,
    apkBannerEnabled: true,
    apkBannerVisible: true,
  };

  if (
    !mounted ||
    !installCheckDone ||
    dismissed ||
    isStandalonePwa() ||
    isNativeCapacitorFromUserAgent() ||
    inNativeApp ||
    alreadyInstalled
  ) {
    return null;
  }

  if (
    variant === 'site' &&
    (!bannerFlags.pwaBannerVisible ||
      (!bannerFlags.pwaBannerEnabled && !bannerFlags.apkBannerEnabled))
  ) {
    return null;
  }

  let content: React.ReactNode = null;

  if (android && variant === 'site') {
    content = (
      <AndroidSiteInstallBanner
        labels={COPY.site}
        apkUrl={bannerFlags.apkBannerEnabled && bannerFlags.apkBannerVisible ? apkUrl : ''}
        onDismiss={dismiss}
        pwaEnabled={bannerFlags.pwaBannerEnabled}
        apkEnabled={bannerFlags.apkBannerEnabled && bannerFlags.apkBannerVisible}
      />
    );
  } else if (android && apkUrl) {
    content = (
      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-card p-4 shadow-lg">
        <AppLogo />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{labels.androidTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{labels.androidSubtitle}</p>
          <a
            href={apkUrl}
            download
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            <Download className="h-4 w-4" />
            Télécharger l&apos;app
          </a>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            Autorisez l&apos;installation depuis cette source si Android le demande.
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 block w-full text-center text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            Continuer sur le site
          </button>
        </div>
        <DismissButton onClick={dismiss} />
      </div>
    );
  } else if (ios) {
    if (variant !== 'site' || bannerFlags.pwaBannerEnabled) {
      if (needsSafari) {
        content = (
          <div className="rounded-xl border border-amber-500/40 bg-card p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <AppLogo />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Ouvrir dans Safari</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Sur iPhone, l&apos;installation ne fonctionne qu&apos;avec <strong>Safari</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={copyPageLink}
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              <ExternalLink className="h-4 w-4" />
              {copied ? 'Lien copié' : 'Copier le lien'}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="mt-3 w-full text-center text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
            >
              Continuer sur le site
            </button>
          </div>
        );
      } else {
        content = (
          <div className="rounded-xl border border-border bg-card p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <AppLogo />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{labels.iosTitle}</p>
                <ol className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                  <li>
                    1. Touchez <strong className="text-foreground">Partager</strong> en bas de Safari
                  </li>
                  <li>
                    2. <strong className="text-foreground">Sur l&apos;écran d&apos;accueil</strong>
                  </li>
                  <li>
                    3. <strong className="text-foreground">Ajouter</strong>
                  </li>
                </ol>
              </div>
              <DismissButton onClick={dismiss} />
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="mt-3 w-full text-center text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
            >
              Continuer sur le site
            </button>
          </div>
        );
      }
    }
  }

  if (!content) return null;

  if (display === 'fab') {
    if (!fabVisible) return null;

    const FabIcon = android ? Smartphone : Download;

    return (
      <div className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom)+0.75rem)] right-3 z-40 md:bottom-5 md:right-5">
        {fabOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40"
              aria-label="Fermer"
              onClick={() => setFabOpen(false)}
            />
            <div className="absolute bottom-full right-0 z-50 mb-2 w-[min(calc(100vw-1.5rem),20rem)]">
              {content}
            </div>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => setFabOpen((open) => !open)}
          className="relative z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
          aria-label="Installer l'application"
          aria-expanded={fabOpen}
        >
          <FabIcon className="h-5 w-5" />
        </button>
      </div>
    );
  }

  const shellClass =
    placement === 'fixed'
      ? 'fixed inset-x-3 bottom-[calc(3.75rem+env(safe-area-inset-bottom)+0.5rem)] z-40 md:inset-x-auto md:bottom-4 md:left-4 md:max-w-sm'
      : '';

  return <div className={shellClass}>{content}</div>;
}
