'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { IMAGE_QUALITY_LCP } from '@/lib/image-quality';
import type { Author } from '@wab-infos/shared';
import { cn, getStrapiMediaUrl, shouldBypassNextImageOptimization } from '@/lib/utils';

/** Si une variante Strapi (medium_/large_/xlarge_/…) 404, retombe sur le fichier original. */
function fallbackOriginalMediaSrc(src: string): string | null {
  const next = src.replace(/\/(thumbnail|x?small|medium|x?large)_/i, '/');
  return next !== src ? next : null;
}

function resolveAuthorAvatarUrl(author: Author): string | null {
  const avatar = author.avatar;
  if (!avatar?.url) return null;
  // Preférer l’original : les variantes medium_/small_ manquent parfois (404).
  return getStrapiMediaUrl(avatar.url);
}

function normalizeXHandle(value: string): string {
  return value.trim().replace(/^@+/, '');
}

function resolveAuthorXProfile(twitter?: string): { href: string; handle: string } | null {
  const raw = twitter?.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const handle = normalizeXHandle(url.pathname.split('/').filter(Boolean)[0] ?? '');
      if (!handle) return { href: raw, handle: 'X' };
      return {
        href: `https://x.com/${handle}`,
        handle: `@${handle}`,
      };
    } catch {
      return { href: raw, handle: 'X' };
    }
  }

  const handle = normalizeXHandle(raw);
  if (!handle) return null;
  return {
    href: `https://x.com/${handle}`,
    handle: `@${handle}`,
  };
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface AuthorAvatarProps {
  author: Author;
  avatarUrl: string | null;
  onDark?: boolean;
  onDarkFromMd?: boolean;
  size?: number;
}

function AuthorAvatar({
  author,
  avatarUrl,
  onDark = false,
  onDarkFromMd = false,
  size = 48,
}: AuthorAvatarProps) {
  const pixelSize = size * 2;
  const [currentSrc, setCurrentSrc] = useState(avatarUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(avatarUrl);
    setFailed(false);
  }, [avatarUrl]);

  return (
    <span
      className={cn(
        'relative block shrink-0 overflow-hidden rounded-full bg-muted ring-2',
        onDark
          ? 'ring-white/70'
          : onDarkFromMd
            ? 'ring-border md:ring-white/70'
            : 'ring-border'
      )}
      style={{ width: size, height: size }}
    >
      {currentSrc && !failed ? (
        <Image
          src={currentSrc}
          alt={author.name}
          width={pixelSize}
          height={pixelSize}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          sizes={`${size}px`}
          quality={IMAGE_QUALITY_LCP}
          unoptimized={shouldBypassNextImageOptimization(currentSrc)}
          onError={() => {
            const fallback = currentSrc ? fallbackOriginalMediaSrc(currentSrc) : null;
            if (fallback) {
              setCurrentSrc(fallback);
              return;
            }
            setFailed(true);
          }}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-primary text-sm font-bold text-primary-foreground">
          {author.name.charAt(0)}
        </span>
      )}
    </span>
  );
}

interface ArticleAuthorMetaProps {
  author: Author;
  onDark?: boolean;
  /** Texte / anneau clairs à partir de md (ex. titre article en overlay). */
  onDarkFromMd?: boolean;
  className?: string;
}

export function ArticleAuthorMeta({
  author,
  onDark = false,
  onDarkFromMd = false,
  className,
}: ArticleAuthorMetaProps) {
  const avatarUrl = resolveAuthorAvatarUrl(author);
  const xProfile = resolveAuthorXProfile(author.twitter);

  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      <Link
        href={`/auteur/${author.slug}`}
        className={cn(
          'group flex min-w-0 items-center gap-3',
          onDark
            ? 'text-white'
            : onDarkFromMd
              ? 'text-foreground md:text-white'
              : 'text-foreground'
        )}
      >
        <AuthorAvatar
          author={author}
          avatarUrl={avatarUrl}
          onDark={onDark}
          onDarkFromMd={onDarkFromMd}
          size={44}
        />
        <span className="min-w-0 text-sm font-semibold leading-tight transition-opacity group-hover:opacity-80 md:text-base">
          {author.name}
        </span>
      </Link>

      {xProfile && (
        <a
          href={xProfile.href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
            onDark
              ? 'border-white/25 bg-white/10 text-white hover:bg-white/20'
              : onDarkFromMd
                ? 'border-border bg-background text-foreground hover:bg-muted md:border-white/25 md:bg-white/10 md:text-white md:hover:bg-white/20'
                : 'border-border bg-background text-foreground hover:bg-muted'
          )}
          aria-label={`Compte X de ${author.name} : ${xProfile.handle}`}
        >
          <XIcon className="h-3.5 w-3.5" />
          <span>{xProfile.handle}</span>
        </a>
      )}
    </div>
  );
}
