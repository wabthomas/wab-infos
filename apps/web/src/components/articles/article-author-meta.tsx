import Link from 'next/link';
import type { Author } from '@wab-infos/shared';
import { ArticleImage } from '@/components/ui/article-image';
import { cn, getStrapiMediaUrl } from '@/lib/utils';

function resolveAuthorXProfile(twitter?: string): { href: string; handle: string } | null {
  const raw = twitter?.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const segment = url.pathname.split('/').filter(Boolean)[0];
      if (!segment) return { href: raw, handle: 'X' };
      return { href: raw, handle: `@${segment.replace(/^@/, '')}` };
    } catch {
      return { href: raw, handle: 'X' };
    }
  }

  const handle = raw.replace(/^@/, '');
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

interface ArticleAuthorMetaProps {
  author: Author;
  variant?: 'inline' | 'card';
  onDark?: boolean;
  className?: string;
}

export function ArticleAuthorMeta({
  author,
  variant = 'inline',
  onDark = false,
  className,
}: ArticleAuthorMetaProps) {
  const avatarUrl = getStrapiMediaUrl(author.avatar?.url);
  const xProfile = resolveAuthorXProfile(author.twitter);

  if (variant === 'card') {
    return (
      <aside
        className={cn(
          'mt-8 flex gap-4 rounded-2xl border border-border bg-muted/30 p-4 sm:p-5',
          className
        )}
        aria-label={`À propos de ${author.name}`}
      >
        <Link
          href={`/auteur/${author.slug}`}
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-primary ring-2 ring-background"
        >
          {avatarUrl ? (
            <ArticleImage
              src={avatarUrl}
              alt={author.name}
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xl font-bold text-primary-foreground">
              {author.name.charAt(0)}
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Auteur
          </p>
          <Link
            href={`/auteur/${author.slug}`}
            className="font-display text-lg font-bold transition-colors hover:text-primary"
          >
            {author.name}
          </Link>
          {author.role && (
            <p className="mt-0.5 text-sm font-medium text-primary">{author.role}</p>
          )}
          {author.bio && (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {author.bio}
            </p>
          )}
          {xProfile && (
            <a
              href={xProfile.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-semibold transition-colors hover:border-foreground/20 hover:bg-muted"
            >
              <XIcon className="h-4 w-4" />
              {xProfile.handle}
            </a>
          )}
        </div>
      </aside>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      <Link
        href={`/auteur/${author.slug}`}
        className={cn(
          'group flex min-w-0 items-center gap-2.5',
          onDark ? 'text-white' : 'text-foreground'
        )}
      >
        <span
          className={cn(
            'relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-primary ring-2',
            onDark ? 'ring-white/30' : 'ring-background'
          )}
        >
          {avatarUrl ? (
            <ArticleImage
              src={avatarUrl}
              alt={author.name}
              className="object-cover transition-transform group-hover:scale-105"
              sizes="36px"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-bold text-primary-foreground">
              {author.name.charAt(0)}
            </span>
          )}
        </span>
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
