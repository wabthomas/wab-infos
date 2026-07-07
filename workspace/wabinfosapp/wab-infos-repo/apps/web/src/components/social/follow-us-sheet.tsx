'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, Users, X } from 'lucide-react';
import type { SocialFollowPlatform } from '@/config/social-follow';
import { socialFollowChannels } from '@/config/social-follow';
import type { SocialFollowerEntry } from '@/config/social-follow';
import { formatFollowerCount } from '@/lib/social/format-follower-count';
import {
  FacebookBrandIcon,
  TikTokBrandIcon,
  WhatsAppBrandIcon,
  XBrandIcon,
  YoutubeBrandIcon,
} from '@/components/social/social-brand-icons';

const ICONS: Record<
  SocialFollowPlatform,
  React.ComponentType<{ className?: string }>
> = {
  whatsapp: WhatsAppBrandIcon,
  facebook: FacebookBrandIcon,
  x: XBrandIcon,
  youtube: YoutubeBrandIcon,
  tiktok: TikTokBrandIcon,
};

interface FollowUsSheetProps {
  open: boolean;
  onClose: () => void;
}

function fallbackChannels(): SocialFollowerEntry[] {
  return socialFollowChannels.map((channel) => ({ ...channel, followers: null }));
}

export function FollowUsSheet({ open, onClose }: FollowUsSheetProps) {
  const [channels, setChannels] = useState<SocialFollowerEntry[]>(fallbackChannels);
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/social/followers', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { channels?: SocialFollowerEntry[] };
      if (data.channels?.length) setChannels(data.channels);
    } catch {
      /* garde les liens sans compteurs */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadStats();
  }, [open, loadStats]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        aria-label="Fermer"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="follow-us-title"
        className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-background shadow-[0_-12px_40px_rgba(0,0,0,0.15)]"
        style={{ paddingBottom: 'calc(3.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto max-w-lg px-4 pt-3">
          <div className="mb-1 flex justify-center">
            <span className="h-1 w-10 rounded-full bg-muted-foreground/25" aria-hidden />
          </div>

          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" aria-hidden />
              <h2 id="follow-us-title" className="text-base font-bold">
                Nous suivre
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ul className="space-y-2 pb-2">
            {channels.map((channel) => {
              const Icon = ICONS[channel.id];
              return (
                <li key={channel.id}>
                  <a
                    href={channel.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 transition-colors active:bg-muted"
                  >
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: channel.brandColor }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-tight">
                        {channel.label}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {channel.handle}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      {loading && channel.followers == null ? (
                        <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
                      ) : channel.followers != null ? (
                        <>
                          <span className="block text-sm font-bold tabular-nums text-primary">
                            {formatFollowerCount(channel.followers)}
                          </span>
                          <span className="block text-[10px] text-muted-foreground">
                            abonnés
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Suivre</span>
                      )}
                    </span>
                    <ExternalLink
                      className="h-4 w-4 shrink-0 text-muted-foreground/70"
                      aria-hidden
                    />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
