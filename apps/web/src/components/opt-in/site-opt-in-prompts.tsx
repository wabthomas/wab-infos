'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  NewsletterOptInPrompt,
  shouldOfferNewsletterPrompt,
} from '@/components/opt-in/newsletter-opt-in-prompt';
import {
  PushOptInPrompt,
  shouldOfferPushPrompt,
} from '@/components/opt-in/push-opt-in-prompt';
import { useSiteChrome } from '@/components/providers/site-chrome-context';

type PromptKind = 'push' | 'newsletter' | null;

const PUSH_DELAY_MS = 4500;
const NEWSLETTER_GAP_MS = 1800;

/**
 * Enchaîne les popups d’opt-in (push puis newsletter) pour les visiteurs
 * qui n’ont pas encore choisi.
 */
export function SiteOptInPrompts() {
  const pathname = usePathname();
  const { chrome } = useSiteChrome();
  const [active, setActive] = useState<PromptKind>(null);
  const [pushDone, setPushDone] = useState(false);
  const startedRef = useRef(false);

  const skipAuthAndHeavyPages =
    pathname.startsWith('/connexion') || pathname.startsWith('/newsletter/');

  useEffect(() => {
    if (skipAuthAndHeavyPages) return;
    if (startedRef.current) return;
    if (!chrome.pushAlertsWidgetEnabled && !chrome.newsletterWidgetEnabled) return;

    startedRef.current = true;
    let cancelled = false;
    let pushTimer: number | undefined;

    const start = async () => {
      const offerPush =
        chrome.pushAlertsWidgetEnabled && (await shouldOfferPushPrompt());

      if (cancelled) return;

      if (offerPush) {
        pushTimer = window.setTimeout(() => {
          if (!cancelled) setActive('push');
        }, PUSH_DELAY_MS);
        return;
      }

      setPushDone(true);
    };

    void start();

    return () => {
      cancelled = true;
      if (pushTimer) window.clearTimeout(pushTimer);
    };
  }, [
    chrome.newsletterWidgetEnabled,
    chrome.pushAlertsWidgetEnabled,
    skipAuthAndHeavyPages,
  ]);

  useEffect(() => {
    if (!pushDone) return;
    if (skipAuthAndHeavyPages) return;
    if (!chrome.newsletterWidgetEnabled) return;
    if (!shouldOfferNewsletterPrompt()) return;

    const timer = window.setTimeout(() => {
      setActive('newsletter');
    }, NEWSLETTER_GAP_MS);

    return () => window.clearTimeout(timer);
  }, [chrome.newsletterWidgetEnabled, pushDone, skipAuthAndHeavyPages]);

  const resolvePush = useCallback(() => {
    setActive(null);
    setPushDone(true);
  }, []);

  const resolveNewsletter = useCallback(() => {
    setActive(null);
  }, []);

  if (skipAuthAndHeavyPages) return null;

  return (
    <>
      {chrome.pushAlertsWidgetEnabled ? (
        <PushOptInPrompt open={active === 'push'} onResolved={resolvePush} />
      ) : null}
      {chrome.newsletterWidgetEnabled ? (
        <NewsletterOptInPrompt
          open={active === 'newsletter'}
          onResolved={resolveNewsletter}
        />
      ) : null}
    </>
  );
}
