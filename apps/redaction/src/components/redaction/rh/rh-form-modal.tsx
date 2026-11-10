'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Keeps RH forms outside the scrollable app shell and above the mobile keyboard. */
export function RhFormModal({ open, busy = false, onClose, children, width = 'max-w-lg' }: {
  open: boolean; busy?: boolean; onClose: () => void; children: ReactNode; width?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [viewport, setViewport] = useState({ top: '0px', height: '100dvh' });
  const layer = useRef<HTMLDivElement>(null);
  const busyRef = useRef(busy);
  const closeRef = useRef(onClose);
  busyRef.current = busy;
  closeRef.current = onClose;
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => layer.current?.querySelector<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)')?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const focusable = layer.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)');
      if (!focusable?.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!layer.current?.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', keydown);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('keydown', keydown); document.body.style.overflow = previous; requestAnimationFrame(() => returnTo?.focus()); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const visual = window.visualViewport;
    if (!visual) return;
    const resize = () => setViewport({ top: `${Math.max(0, visual.offsetTop)}px`, height: `${Math.max(120, visual.height)}px` });
    resize();
    visual.addEventListener('resize', resize);
    visual.addEventListener('scroll', resize);
    return () => { visual.removeEventListener('resize', resize); visual.removeEventListener('scroll', resize); };
  }, [open]);
  if (!open || !mounted) return null;
  return createPortal(<div ref={layer} style={{ '--rh-modal-top': viewport.top, '--rh-modal-height': viewport.height } as React.CSSProperties}
    className="fixed inset-x-0 top-[var(--rh-modal-top)] z-[150] flex h-[var(--rh-modal-height)] items-end justify-center bg-black/65 backdrop-blur-sm print:hidden sm:items-center sm:p-4"
    onMouseDown={event => { if (event.target === event.currentTarget && !busyRef.current) closeRef.current(); }}>
    <div className={`flex max-h-full w-full min-h-0 flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:max-h-[calc(100%-2rem)] sm:rounded-3xl ${width}`}>{children}</div>
  </div>, document.body);
}
