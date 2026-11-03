'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Megaphone, X } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';

type Announcement = { id: string; title: string; body: string; url: string | null };

export function RhAnnouncementPopup() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    fetchRedaction('/api/redaction/rh/annonce', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (data.message && !data.acknowledged) setAnnouncement(data.message);
      })
      .catch(() => undefined);
  }, []);

  if (!announcement) return null;

  async function acknowledge() {
    setAnnouncement(null);
    fetchRedaction('/api/redaction/rh/annonce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: announcement!.id }),
    }).catch(() => undefined);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rh-announcement-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) acknowledge();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-primary/[0.12] to-transparent px-5 py-4">
          <div className="flex items-center gap-2 text-primary">
            <Megaphone className="h-5 w-5" />
            <h2 id="rh-announcement-title" className="font-display text-lg font-bold">
              {announcement.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={acknowledge}
            aria-label="Fermer"
            className="rounded-full border border-border p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">
          <p className="whitespace-pre-line text-sm leading-6 text-foreground">{announcement.body}</p>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {announcement.url ? (
              <Link
                href={announcement.url}
                onClick={acknowledge}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                Plus d’infos
              </Link>
            ) : null}
            <button
              type="button"
              onClick={acknowledge}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              J’ai compris
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
