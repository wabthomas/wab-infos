'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';

/** Visible seulement si le dossier a accès au Chat RH ; compteur lié aux lectures en base. */
export function RhChatFab() {
  const [count, setCount] = useState(0);
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    const update = async () => {
      try {
        const response = await fetchRedaction('/api/redaction/rh/mon-espace/chat/non-lus', { cache: 'no-store' });
        if (!active) return;
        if (!response.ok) { setAvailable(false); return; }
        const data = await response.json();
        if (!active) return;
        setAvailable(true);
        setCount(typeof data.count === 'number' ? Math.max(0, data.count) : 0);
      } catch { if (active) setAvailable(false); }
    };
    void update();
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') void update(); }, 15_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void update(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  if (!available) return null;
  return <Link href="/mon-rh/chat" aria-label={count ? `Chat RH, ${count >= 100 ? 'plus de 99' : count} message${count > 1 ? 's' : ''} non lu${count > 1 ? 's' : ''}` : 'Ouvrir le Chat RH'} className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#00a884] text-white shadow-lg transition-transform active:scale-95 lg:bottom-6 lg:right-6">
    <MessageCircle className="h-6 w-6" aria-hidden="true" />
    {count > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 grid min-h-6 min-w-6 place-items-center rounded-full border-2 border-background bg-red-600 px-1 text-[10px] font-bold text-white">{count >= 100 ? '99+' : count}</span>}
  </Link>;
}
