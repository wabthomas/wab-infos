'use client';

import { useEffect, useState } from 'react';

interface UseAutoHideOnScrollOptions {
  /** Toujours visible tant que le scroll est sous ce seuil (px). */
  threshold?: number;
  /** Delta minimal (px) pour déclencher affichage / masquage. */
  delta?: number;
}

/**
 * Affiche / masque le chrome au scroll (mobile).
 * Lisse les à-coups via rAF + hysteresis directionnelle.
 */
export function useAutoHideOnScroll({
  threshold = 72,
  delta = 10,
}: UseAutoHideOnScrollOptions = {}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let lastY = window.scrollY;
    let lastVisible = true;
    let ticking = false;
    let accumulated = 0;

    const apply = (next: boolean) => {
      if (next === lastVisible) return;
      lastVisible = next;
      setVisible(next);
    };

    const update = () => {
      const y = Math.max(0, window.scrollY);
      const diff = y - lastY;

      if (y <= threshold) {
        accumulated = 0;
        apply(true);
        lastY = y;
        ticking = false;
        return;
      }

      // Même direction → accumule ; changement de sens → reset
      if ((diff > 0 && accumulated < 0) || (diff < 0 && accumulated > 0)) {
        accumulated = 0;
      }
      accumulated += diff;

      if (accumulated > delta) {
        apply(false);
        accumulated = 0;
      } else if (accumulated < -delta) {
        apply(true);
        accumulated = 0;
      }

      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold, delta]);

  return visible;
}
