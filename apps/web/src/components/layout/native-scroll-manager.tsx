'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Next.js conserve la position de scroll lors d'une navigation si la page cible
 * est déjà visible dans le viewport (comportement documenté de <Link>). Sur le
 * site public, cela laisse l'article suivant ouvert en bas de page. On force le
 * retour en haut après chaque changement de route, sauf pour les liens à ancre.
 */
export function NativeScrollManager() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (window.location.hash) return;

    const reset = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    reset();
    const frame = window.requestAnimationFrame(reset);
    const timer = window.setTimeout(reset, 80);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
