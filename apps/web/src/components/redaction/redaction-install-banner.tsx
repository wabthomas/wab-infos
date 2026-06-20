'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { isRedactionStandalone } from '@/lib/redaction/register-service-worker';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function RedactionInstallBanner() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isRedactionStandalone()) return;

    if (isIos()) {
      setShowIosHint(true);
      return;
    }

    function onInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onInstallPrompt);
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  if (dismissed || isRedactionStandalone()) return null;

  if (installEvent) {
    return (
      <div className="mx-auto mb-6 flex max-w-md items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Installer l&apos;app rédaction</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Accès rapide depuis votre écran d&apos;accueil, sans barre d&apos;adresse.
          </p>
          <button
            type="button"
            onClick={install}
            className="mt-3 h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Installer
          </button>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-muted-foreground"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (showIosHint) {
    return (
      <div className="mx-auto mb-6 flex max-w-md items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
        <Share className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold">Installer sur iPhone</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Safari → Partager → <strong>Sur l&apos;écran d&apos;accueil</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-muted-foreground"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return null;
}
