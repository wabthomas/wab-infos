import Link from 'next/link';
import Image from 'next/image';
import type { Author } from '@wab-infos/shared';
import { cn, getStrapiMediaUrl } from '@/lib/utils';

function resolveAuthorAvatarUrl(author: Author): string | null {
  const avatar = author.avatar;
  if (!avatar?.url) return null;
  // Éviter thumbnail/small (flou à l'affichage) — source nette redimensionnée par Next.js
  const src = avatar.formats?.medium?.url || avatar.formats?.large?.url || avatar.url;
  return getStrapiMediaUrl(src);
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
  size?: number;
}

function AuthorAvatar({ author, avatarUrl, onDark = false, size = 48 }: AuthorAvatarProps) {
  const pixelSize = size * 2;

  return (
    <span
      className={cn(
        'relative block shrink-0 overflow-hidden rounded-full bg-muted ring-2',
        onDark ? 'ring-white/70' : 'ring-border'
      )}
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={author.name}
          width={pixelSize}
          height={pixelSize}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          sizes={`${size}px`}
          quality={95}
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
  className?: string;
}

export function ArticleAuthorMeta({
  author,
  onDark = false,
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
          onDark ? 'text-white' : 'text-foreground'
        )}
      >
        <AuthorAvatar author={author} avatarUrl={avatarUrl} onDark={onDark} size={44} />
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
