'use client';

import { useEffect, useState } from 'react';
import { Download, ExternalLink, Share, Smartphone, X } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { PWA_INSTALL_DISMISS } from '@/lib/pwa/constants';
import {
  isIosDevice,
  isStandalonePwa,
  needsSafariForIosInstall,
  persistPwaVariantFromPath,
  type PwaVariant,
} from '@/lib/pwa/detect';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaInstallBannerProps {
  variant: PwaVariant;
  /** fixed = bandeau flottant site ; inline = dans le flux (login rédaction) */
  placement?: 'fixed' | 'inline';
}

const COPY = {
  site: {
    title: 'Installer Wab-infos',
    subtitle: 'Accès rapide à l’actualité depuis votre écran d’accueil.',
    iosTitle: 'Ajouter Wab-infos à l’écran d’accueil',
  },
  redaction: {
    title: 'Installer l’app rédaction',
    subtitle: 'Publiez depuis votre mobile en un geste.',
    iosTitle: 'Ajouter l’app rédaction à l’écran d’accueil',
  },
} as const;

export function PwaInstallBanner({ variant, placement = 'inline' }: PwaInstallBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [ios, setIos] = useState(false);
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

    if (isStandalonePwa()) return;

    if (isIosDevice()) {
      setIos(true);
      setNeedsSafari(needsSafariForIosInstall());
      return;
    }

    function onInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }

    function onAppInstalled() {
      persistPwaVariantFromPath(window.location.pathname);
    }

    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [dismissKey]);

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(dismissKey, '1');
    } catch {
      // ignore
    }
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') {
      persistPwaVariantFromPath(window.location.pathname);
    }
    setInstallEvent(null);
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

  if (!mounted || dismissed || isStandalonePwa()) return null;

  const shellClass =
    placement === 'fixed'
      ? 'fixed inset-x-3 bottom-[calc(3.75rem+env(safe-area-inset-bottom)+0.5rem)] z-40 md:inset-x-auto md:bottom-4 md:left-4 md:max-w-sm'
      : '';

  let content: React.ReactNode = null;

  if (installEvent) {
    content = (
      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-card p-4 shadow-lg">
        <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{labels.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{labels.subtitle}</p>
          <button
            type="button"
            onClick={install}
            className="mt-3 h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Installer
          </button>
        </div>
        <button type="button" onClick={dismiss} className="text-muted-foreground" aria-label="Fermer">
          <X className="h-4 w-4" />
        </button>
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
            <button type="button" onClick={dismiss} className="text-muted-foreground" aria-label="Fermer">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      );
    }
  } else if (placement === 'fixed') {
    content = (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
        <Smartphone className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{labels.title}</p>
          <p className="text-xs text-muted-foreground">{labels.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-muted-foreground"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (!content) return null;

  return <div className={shellClass}>{content}</div>;
}
