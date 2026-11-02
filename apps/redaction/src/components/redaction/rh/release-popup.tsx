'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import type { RhRelease } from '@/lib/redaction/rh/releases';

const endpoint = '/api/redaction/rh/releases';
const keyFor = (accountId: number, id: string) => `redaction-rh-release:${accountId}:${id}`;

export function RhReleasePopup({ accountId }: { accountId: number }) {
  const [release, setRelease] = useState<RhRelease | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchRedaction(endpoint, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json() as { release: RhRelease | null };
        if (!data.release || controller.signal.aborted) return;
        const key = keyFor(accountId, data.release.id);
        try {
          if (localStorage.getItem(key) === '1') {
            void acknowledge(data.release.id);
            return;
          }
        } catch {}
        setRelease(data.release);
      }).catch(() => undefined);
    return () => controller.abort();
  }, [accountId]);

  useEffect(() => {
    if (!release) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss(release);
      if (event.key !== 'Tab') return;
      const buttons = document.querySelectorAll<HTMLElement>('[data-rh-release-action]');
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    const onStorage = (event: StorageEvent) => { if (event.key === keyFor(accountId, release.id) && event.newValue === '1') setRelease(null); };
    window.addEventListener('storage', onStorage);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKeyDown); window.removeEventListener('storage', onStorage); };
  }, [accountId, release]);

  function acknowledge(id: string) {
    return fetchRedaction(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }), keepalive: true }).catch(() => undefined);
  }

  function dismiss(item: RhRelease) {
    try { localStorage.setItem(keyFor(accountId, item.id), '1'); } catch {}
    setRelease(null);
    void acknowledge(item.id);
  }

  if (!release) return null;
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) dismiss(release); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="rh-release-title" aria-describedby="rh-release-description" className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#191923] p-6 text-white shadow-2xl sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-rose-600/20 blur-3xl" />
      <button ref={closeRef} data-rh-release-action type="button" aria-label="Fermer l’annonce" onClick={() => dismiss(release)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20"><X className="h-4 w-4" /></button>
      <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-rose-200"><Sparkles className="h-3.5 w-3.5" /> Nouveauté RH</span>
      <h2 id="rh-release-title" className="mt-5 font-display text-2xl font-bold leading-tight">{release.title}</h2>
      <p id="rh-release-description" className="mt-3 text-sm leading-6 text-zinc-300">{release.body}</p>
      <ul className="mt-5 space-y-3 text-sm text-zinc-200">{release.highlights.map((highlight) => <li key={highlight} className="flex gap-2"><span aria-hidden className="mt-0.5 text-rose-300">✦</span>{highlight}</li>)}</ul>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link data-rh-release-action href={release.url} onClick={() => dismiss(release)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Découvrir <ArrowRight className="h-4 w-4" /></Link>
        <button data-rh-release-action type="button" onClick={() => dismiss(release)} className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white">Plus tard</button>
      </div>
    </section>
  </div>;
}
