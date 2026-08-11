'use client';

import { fetchRedaction } from '@/lib/redaction/public-path';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NotificationSummary {
  draftCount: number;
  importedDraftCount: number;
  pendingComments: number;
  badgeCount: number;
  items: Array<{
    id: string;
    type: 'draft' | 'imported' | 'comment';
    title: string;
    body: string;
    href: string;
  }>;
}

const EMPTY: NotificationSummary = {
  draftCount: 0,
  importedDraftCount: 0,
  pendingComments: 0,
  badgeCount: 0,
  items: [],
};

export function useRedactionNotifications(pollMs = 60_000) {
  const [summary, setSummary] = useState<NotificationSummary>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchRedaction('/api/redaction/notifications/summary')
        .then((r) => r.json())
        .then((data: Partial<NotificationSummary>) => {
          if (cancelled) return;
          setSummary({
            draftCount: data.draftCount ?? 0,
            importedDraftCount: data.importedDraftCount ?? 0,
            pendingComments: data.pendingComments ?? 0,
            badgeCount: data.badgeCount ?? 0,
            items: Array.isArray(data.items) ? data.items : [],
          });
        })
        .catch(() => undefined);
    };

    load();
    const interval = window.setInterval(load, pollMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pollMs]);

  return summary;
}

export function RedactionNotificationsBell({
  summary,
  className,
}: {
  summary: NotificationSummary;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const badge = summary.badgeCount;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {badge > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-bold">Notifications</p>
            <p className="text-xs text-muted-foreground">Brouillons, imports et commentaires</p>
          </div>
          {summary.items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Rien de nouveau pour le moment
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {summary.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 transition-colors hover:bg-muted"
                  >
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-300">{item.body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-border p-2">
            <Link
              href="/nouveau"
              onClick={() => setOpen(false)}
              className="flex h-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground"
            >
              Écrire un article
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
