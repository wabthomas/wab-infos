'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, LogOut, UserRound, UserRoundPen } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import type { RhNotification } from '@/lib/redaction/rh/notifications';

export function MyRhTopbarActions() {
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const [photo, setPhoto] = useState('');
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unread, setUnread] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetchRedaction('/api/redaction/rh/mon-espace/notifications', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json() as { notifications?: RhNotification[] };
      setUnread((data.notifications ?? []).filter((item) => !item.readAt).length);
    } catch { /* Le lien reste utilisable si le compteur est indisponible. */ }
  }, []);

  useEffect(() => {
    let active = true;
    fetchRedaction('/api/redaction/rh/mon-espace/fiche', { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (active) setPhoto(data?.profile?.photo ?? ''); })
      .catch(() => undefined);
    void loadNotifications();
    const timer = window.setInterval(() => void loadNotifications(), 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [loadNotifications]);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, [open]);

  async function logout() {
    setLoggingOut(true);
    try { await fetchRedaction('/api/redaction/auth/logout', { method: 'POST' }); }
    finally { router.replace('/login'); router.refresh(); }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href="/mon-rh/notifications"
        aria-label={`Notifications RH${unread ? `, ${unread} non lues` : ''}`}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>}
      </Link>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label="Ouvrir mon profil RH"
          aria-haspopup="menu"
          aria-expanded={open}
          className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-foreground shadow-sm"
        >
          {photo ? <img src={photo} alt="Photo de profil" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}
        </button>
        {open && <div role="menu" className="absolute right-0 top-full z-[60] mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-card p-1.5 text-sm shadow-xl">
          <Link role="menuitem" href="/mon-rh/fiche" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-medium hover:bg-muted">
            <UserRound className="h-4 w-4 text-muted-foreground" /> Voir mon profil
          </Link>
          <Link role="menuitem" href="/mon-rh/fiche?edit=1" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-medium hover:bg-muted">
            <UserRoundPen className="h-4 w-4 text-muted-foreground" /> Modifier mon profil
          </Link>
          <div className="my-1 border-t border-border" />
          <button role="menuitem" type="button" disabled={loggingOut} onClick={() => void logout()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left font-semibold text-red-600 hover:bg-red-600/10 disabled:opacity-50 dark:text-red-400">
            <LogOut className="h-4 w-4" /> {loggingOut ? 'Déconnexion…' : 'Déconnexion'}
          </button>
        </div>}
      </div>
    </div>
  );
}
