'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { WhatsAppBrandIcon } from '@/components/social/social-brand-icons';

const OLD_DISMISS_KEY = 'wab-whatsapp-channel-popup';
const DISMISS_UNTIL_KEY = 'wab-whatsapp-channel-popup-until';
const DEFAULT_DELAY_MS = 60_000;
const DISMISS_MS = 12 * 60 * 60 * 1000;
const JOINED_MS = 7 * 24 * 60 * 60 * 1000;

function wasDismissed(): boolean {
  try {
    localStorage.removeItem(OLD_DISMISS_KEY);
    const until = Number(localStorage.getItem(DISMISS_UNTIL_KEY));
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

function dismissFor(ms: number) {
  try {
    localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + ms));
  } catch {
    // ignore
  }
}

export function WhatsAppChannelPopup({
  enabled,
  href,
  delayMs = DEFAULT_DELAY_MS,
}: {
  enabled: boolean;
  href: string;
  delayMs?: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled || !href || wasDismissed()) return;

    const waitMs = Number.isFinite(delayMs) ? Math.max(5_000, delayMs) : DEFAULT_DELAY_MS;
    const started = Date.now();
    let visibleElapsed = 0;
    let last = started;

    const timer = window.setInterval(() => {
      const now = Date.now();
      const hidden = typeof document.visibilityState === 'string' && document.visibilityState === 'hidden';
      if (!hidden) {
        visibleElapsed += now - last;
      }
      last = now;
      // Filet WebView : si visibilityState reste coincé sur hidden, on affiche quand même.
      if (visibleElapsed >= waitMs || now - started >= waitMs * 2) {
        window.clearInterval(timer);
        setOpen(true);
      }
    }, 500);

    return () => window.clearInterval(timer);
  }, [enabled, href, delayMs]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeTemporarily();
    };
    document.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open]);

  function closeTemporarily() {
    setOpen(false);
    dismissFor(DISMISS_MS);
  }

  if (!open || !enabled || !href) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Fermer"
        onClick={closeTemporarily}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-channel-popup-title"
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-card p-6 shadow-2xl ring-1 ring-border"
      >
        <button
          type="button"
          onClick={closeTemporarily}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-sm"
            style={{ backgroundColor: '#25D366' }}
            aria-hidden
          >
            <WhatsAppBrandIcon className="h-9 w-9" />
          </span>
          <h2
            id="whatsapp-channel-popup-title"
            className="mt-4 font-display text-xl font-bold text-foreground"
          >
            Rejoignez notre chaîne WhatsApp
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Recevez l’actualité Wab-infos directement sur WhatsApp, sans installer d’application
            supplémentaire.
          </p>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => dismissFor(JOINED_MS)}
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold text-white shadow-sm"
            style={{ backgroundColor: '#25D366' }}
          >
            <WhatsAppBrandIcon className="h-5 w-5" />
            Rejoindre la chaîne
          </a>
        </div>
      </div>
    </div>
  );
}
