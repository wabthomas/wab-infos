'use client';

import { useEffect, useState } from 'react';
import { Download, ExternalLink, Share, Smartphone, X } from 'lucide-react';
import { PWA_INSTALL_DISMISS } from '@/lib/pwa/constants';
import {
  isIosDevice,
  isStandalonePwa,
  needsSafariForIosInstall,
  persistPwaVariantFromPath,
  type PwaVariant,
} from '@/lib/pwa/detect';
import { isAndroidDevice, isNativeCapacitorApp, isNativeCapacitorFromUserAgent } from '@wab-infos/shared';

interface PwaInstallBannerProps {
  variant: PwaVariant;
  placement?: 'fixed' | 'inline';
}

const COPY = {
  site: {
    iosTitle: 'Ajouter Wab-infos à l’écran d’accueil',
    androidTitle: 'Installer l’app Wab-infos',
    androidSubtitle: 'Notifications en direct et accès rapide à l’actualité.',
  },
  redaction: {
    iosTitle: 'Ajouter l’app rédaction à l’écran d’accueil',
    androidTitle: 'Installer l’app Wab-infos',
    androidSubtitle: 'Notifications rédaction et publication depuis votre mobile.',
  },
} as const;

const APK_URL =
  process.env.NEXT_PUBLIC_ANDROID_APK_URL ||
  `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://wab-infos.com').replace(/\/$/, '')}/downloads/wab-infos.apk`;

function DismissButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 text-muted-foreground" aria-label="Fermer">
      <X className="h-4 w-4" />
    </button>
  );
}

export function PwaInstallBanner({ variant, placement = 'inline' }: PwaInstallBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [inNativeApp, setInNativeApp] = useState(false);
  const [ios, setIos] = useState(false);
  const [android, setAndroid] = useState(false);
  const [needsSafari, setNeedsSafari] = useState(false);
  const [copied, setCopied] = useState(false);

  const dismissKey = PWA_INSTALL_DISMISS[variant];
  const labels = COPY[variant];

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(dismissKey) === '1') setDismissed(true);
    } catch {
      // ignore
    }

    if (isStandalonePwa() || isNativeCapacitorFromUserAgent()) {
      setInNativeApp(true);
      return;
    }

    void isNativeCapacitorApp().then((native) => {
      if (native) setInNativeApp(true);
    });

    if (isIosDevice()) {
      setIos(true);
      setNeedsSafari(needsSafariForIosInstall());
      return;
    }

    if (isAndroidDevice()) {
      setAndroid(true);
    }
  }, [dismissKey]);

  function dismiss() {
    setDismissed(true);
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

  if (!mounted || dismissed || isStandalonePwa() || inNativeApp) return null;

  let content: React.ReactNode = null;

  if (android && APK_URL) {
    content = (
      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-card p-4 shadow-lg">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{labels.androidTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{labels.androidSubtitle}</p>
          <a
            href={APK_URL}
            download
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            <Download className="h-4 w-4" />
            Télécharger l&apos;app
          </a>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            Autorisez l&apos;installation depuis cette source si Android le demande.
          </p>
        </div>
        <DismissButton onClick={dismiss} />
      </div>
    );
  } else if (ios) {
    if (needsSafari) {
      content = (
        <div className="rounded-xl border border-amber-500/40 bg-card p-4 shadow-lg">
          <p className="text-sm font-semibold text-foreground">Ouvrir dans Safari</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Sur iPhone, l&apos;installation ne fonctionne qu&apos;avec <strong>Safari</strong>.
          </p>
          <button
            type="button"
            onClick={copyPageLink}
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            {copied ? 'Lien copié' : 'Copier le lien'}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 block w-full text-center text-xs text-muted-foreground"
          >
            Plus tard
          </button>
        </div>
      );
    } else {
      content = (
        <div className="rounded-xl border border-border bg-card p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <Share className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
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
        </div>
      );
    }
  }

  if (!content) return null;

  return <div>{content}</div>;
}
