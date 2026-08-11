'use client';

import { useEffect, useRef, useState } from 'react';
import { isNativeCapacitorFromUserAgent } from '@wab-infos/shared';

declare global {
  interface Window {
    /** Hauteur IME en CSS px, poussée par l’APK Android. */
    __wabImeBottom?: number;
  }
  interface Navigator {
    virtualKeyboard?: {
      overlaysContent: boolean;
      boundingRect: DOMRect;
      addEventListener: (type: 'geometrychange', listener: () => void) => void;
      removeEventListener: (type: 'geometrychange', listener: () => void) => void;
    };
  }
}

const OPEN_THRESHOLD_PX = 40;
const CLOSE_THRESHOLD_PX = 24;

function readCssPxVar(name: string): number {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!raw) return 0;
    if (raw.endsWith('px')) return Math.max(0, parseFloat(raw) || 0);
    const n = parseFloat(raw);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  } catch {
    return 0;
  }
}

/**
 * Mesure stable de la hauteur clavier pour coller la barre d’outils
 * au-dessus du clavier (navigateur mobile + WebView APK).
 *
 * Sur APK edge-to-edge, le clavier SUPERPOSE la WebView (adjustResize inefficace) :
 * on doit donc utiliser `__wabImeBottom` / `--wab-ime-bottom` envoyés par Android.
 */
export function measureKeyboardBottomInset(): number {
  if (typeof window === 'undefined') return 0;

  const isNative = isNativeCapacitorFromUserAgent();

  const bridgeIme =
    typeof window.__wabImeBottom === 'number' && Number.isFinite(window.__wabImeBottom)
      ? Math.max(0, window.__wabImeBottom)
      : 0;
  const cssVarIme = readCssPxVar('--wab-ime-bottom');
  const nativeIme = Math.max(bridgeIme, cssVarIme);

  const vv = window.visualViewport;
  let visualGap = 0;
  if (vv) {
    visualGap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  }

  let vkGap = 0;
  const vk = navigator.virtualKeyboard;
  if (vk?.overlaysContent) {
    vkGap = Math.max(0, vk.boundingRect?.height ?? 0);
  }

  const cssGap = readCssPxVar('keyboard-inset-bottom');
  const safeBottom = readCssPxVar('--wab-safe-bottom') || readSafeAreaInsetBottom();

  // APK : prioriser l’IME natif (sinon barre coincée derrière le clavier).
  // On retire le safe-area déjà hors WebView pour coller la barre au clavier.
  if (isNative) {
    const raw = Math.max(nativeIme, visualGap, vkGap, cssGap);
    return Math.round(Math.max(0, raw - safeBottom));
  }

  // Navigateur : visualViewport / VirtualKeyboard suffisent.
  const raw = Math.max(visualGap, vkGap, cssGap);
  return Math.round(Math.max(0, raw > OPEN_THRESHOLD_PX ? raw - Math.min(safeBottom, 16) : raw));
}

function readSafeAreaInsetBottom(): number {
  if (typeof document === 'undefined') return 0;
  try {
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;bottom:0;left:0;width:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none';
    document.documentElement.appendChild(probe);
    const value = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
    probe.remove();
    return Math.max(0, value);
  } catch {
    return 0;
  }
}

export function useEditorKeyboardInset(enabled = true): {
  keyboardInset: number;
  visualOffsetTop: number;
} {
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [visualOffsetTop, setVisualOffsetTop] = useState(0);
  const stableRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    try {
      if (navigator.virtualKeyboard) {
        navigator.virtualKeyboard.overlaysContent = true;
      }
    } catch {
      /* non supporté */
    }

    const publish = () => {
      const nextRaw = measureKeyboardBottomInset();
      const prev = stableRef.current;
      let next = prev;
      if (prev <= 0 && nextRaw >= OPEN_THRESHOLD_PX) next = nextRaw;
      else if (prev > 0 && nextRaw <= CLOSE_THRESHOLD_PX) next = 0;
      else if (prev > 0 && Math.abs(nextRaw - prev) >= 8) next = nextRaw;
      else if (prev <= 0 && nextRaw > 0 && nextRaw < OPEN_THRESHOLD_PX) {
        // petit clavier / barre de suggestions : quand même remonter un peu
        next = nextRaw;
      }

      stableRef.current = next;
      setKeyboardInset(next);
      setVisualOffsetTop(Math.max(0, Math.round(window.visualViewport?.offsetTop ?? 0)));
    };

    const schedule = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0;
        publish();
      });
    };

    publish();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', schedule);
    vv?.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    window.addEventListener('focusin', schedule);
    window.addEventListener('focusout', schedule);
    window.addEventListener('wab-ime', schedule as EventListener);
    navigator.virtualKeyboard?.addEventListener('geometrychange', schedule);

    const isNative = isNativeCapacitorFromUserAgent();
    // Poll plus serré sur APK : les insets IME arrivent souvent sans resize web fiable.
    const pollNative = isNative ? window.setInterval(schedule, 100) : 0;

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      vv?.removeEventListener('resize', schedule);
      vv?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      window.removeEventListener('focusin', schedule);
      window.removeEventListener('focusout', schedule);
      window.removeEventListener('wab-ime', schedule as EventListener);
      navigator.virtualKeyboard?.removeEventListener('geometrychange', schedule);
      if (pollNative) window.clearInterval(pollNative);
    };
  }, [enabled]);

  return { keyboardInset, visualOffsetTop };
}
