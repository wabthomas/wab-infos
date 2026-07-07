'use client';

import { useEffect, useState } from 'react';

interface UseAutoHideOnScrollOptions {
  /** Toujours visible tant que le scroll est sous ce seuil (px). */
  threshold?: number;
  /** Delta minimal (px) pour déclencher affichage / masquage. */
  delta?: number;
}

export function useAutoHideOnScroll({
  threshold = 72,
  delta = 12,
}: UseAutoHideOnScrollOptions = {}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;

      if (y <= threshold) {
        setVisible(true);
      } else if (y - lastY > delta) {
        setVisible(false);
      } else if (lastY - y > delta) {
        setVisible(true);
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
