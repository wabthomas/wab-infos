'use client';

import { useEffect, useState } from 'react';
import { Download, ExternalLink, Share, X } from 'lucide-react';
import { isRedactionStandalone } from '@/lib/redaction/register-service-worker';
import { isIosDevice, needsSafariForIosInstall } from '@/lib/redaction/pwa-detect';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'wab-redaction-install-dismiss';

export function RedactionInstallBanner() {
  const [mounted, setMounted] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [ios, setIos] = useState(false);
  const [needsSafari, setNeedsSafari] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') setDismissed(true);
    } catch {
      // ignore
    }

    if (isRedactionStandalone()) return;

    if (isIosDevice()) {
      setIos(true);
      setNeedsSafari(needsSafariForIosInstall());
      return;
    }

    function onInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onInstallPrompt);
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
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

  if (!mounted || dismissed || isRedactionStandalone()) return null;

  if (installEvent) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4">
        <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Installer l&apos;app rédaction</p>
          <p className="mt-1 text-xs text-white/70">
            Accès rapide depuis votre écran d&apos;accueil.
          </p>
          <button
            type="button"
            onClick={install}
            className="mt-3 h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Installer
          </button>
        </div>
        <button type="button" onClick={dismiss} className="text-white/60" aria-label="Fermer">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (ios) {
    if (needsSafari) {
      return (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/15 p-4">
          <p className="text-sm font-semibold text-white">Ouvrir dans Safari</p>
          <p className="mt-1 text-xs leading-relaxed text-white/75">
            Sur iPhone, l&apos;installation ne fonctionne qu&apos;avec <strong>Safari</strong> (pas
            Chrome ni Facebook).
          </p>
          <button
            type="button"
            onClick={copyPageLink}
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-[#0c0c0f]"
          >
            <ExternalLink className="h-4 w-4" />
            {copied ? 'Lien copié — collez dans Safari' : 'Copier le lien'}
          </button>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <Share className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Ajouter à l&apos;écran d&apos;accueil</p>
            <ol className="mt-2 space-y-1.5 text-xs leading-relaxed text-white/80">
              <li>
                1. Touchez <strong className="text-white">Partager</strong>{' '}
                <span className="inline-block align-middle text-base" aria-hidden>
                  ⎋
                </span>{' '}
                en bas de Safari
              </li>
              <li>
                2. Faites défiler → <strong className="text-white">Sur l&apos;écran d&apos;accueil</strong>
              </li>
              <li>3. Touchez <strong className="text-white">Ajouter</strong></li>
            </ol>
            <p className="mt-2 text-[11px] text-white/55">
              Sur iPhone, Apple ne propose pas de bouton « Installer » automatique.
            </p>
          </div>
          <button type="button" onClick={dismiss} className="text-white/50" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
