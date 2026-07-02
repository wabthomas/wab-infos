'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { isNativeCapacitorFromUserAgent } from '@wab-infos/shared';

const PULL_THRESHOLD = 72;
const PULL_MAX = 112;

export function NativePullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const pullingRef = useRef(false);
  const startYRef = useRef(0);
  const touchMoveAttachedRef = useRef(false);
  const refreshingRef = useRef(false);
  const routerRef = useRef(router);
  const onTouchMoveRef = useRef<((event: TouchEvent) => void) | null>(null);

  refreshingRef.current = refreshing;
  routerRef.current = router;

  useEffect(() => {
    if (!isNativeCapacitorFromUserAgent()) return;

    function detachTouchMove() {
      const handler = onTouchMoveRef.current;
      if (!touchMoveAttachedRef.current || !handler) return;
      document.removeEventListener('touchmove', handler);
      touchMoveAttachedRef.current = false;
    }

    function attachTouchMove() {
      const handler = onTouchMoveRef.current;
      if (!handler || touchMoveAttachedRef.current) return;
      document.addEventListener('touchmove', handler, { passive: false });
      touchMoveAttachedRef.current = true;
    }

    function resetPull() {
      pullingRef.current = false;
      pullRef.current = 0;
      setPull(0);
      detachTouchMove();
    }

    onTouchMoveRef.current = (event: TouchEvent) => {
      if (!pullingRef.current || refreshingRef.current || event.touches.length !== 1) return;

      const delta = event.touches[0].clientY - startYRef.current;
      if (delta <= 0 || window.scrollY > 2) {
        resetPull();
        return;
      }

      const nextPull = Math.min(delta * 0.5, PULL_MAX);
      pullRef.current = nextPull;
      setPull(nextPull);

      if (nextPull > 8) {
        event.preventDefault();
      }
    };

    function onTouchStart(event: TouchEvent) {
      if (refreshingRef.current || window.scrollY > 2 || event.touches.length !== 1) return;
      startYRef.current = event.touches[0].clientY;
      pullingRef.current = true;
      attachTouchMove();
    }

    function onTouchEnd() {
      if (!pullingRef.current) return;

      const distance = pullRef.current;
      pullingRef.current = false;
      detachTouchMove();

      if (distance >= PULL_THRESHOLD && !refreshingRef.current) {
        setRefreshing(true);
        setPull(PULL_THRESHOLD);
        routerRef.current.refresh();
        window.setTimeout(() => {
          setRefreshing(false);
          pullRef.current = 0;
          setPull(0);
        }, 900);
        return;
      }

      resetPull();
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      detachTouchMove();
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [router]);

  if (!isNativeCapacitorFromUserAgent()) return null;
  if (pull <= 0 && !refreshing) return null;

  const progress = Math.min(1, pull / PULL_THRESHOLD);

  return (
    <div
      className="native-ptr pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center"
      aria-hidden
    >
      <div
        className="mt-2 flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/95 shadow-sm backdrop-blur"
        style={{
          transform: `translateY(${Math.min(pull, PULL_MAX)}px)`,
          opacity: refreshing ? 1 : 0.35 + progress * 0.65,
        }}
      >
        {refreshing ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <span
            className="block h-4 w-4 border-l-2 border-t-2 border-primary"
            style={{ transform: `rotate(${45 + progress * 135}deg)` }}
          />
        )}
      </div>
    </div>
  );
}
