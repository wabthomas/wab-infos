'use client';

import { useCallback, useEffect, useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import {
  isArticleLiked,
  setArticleLikedLocally,
  subscribeToLikesChanges,
} from '@/lib/article-likes';
import { cn } from '@/lib/utils';

interface ArticleLikeButtonProps {
  documentId: string;
  initialCount?: number;
  showCount?: boolean;
  className?: string;
  /** Style compact pour la barre mobile */
  compact?: boolean;
  /** Pouce + compteur inline dans la rangée méta (date / vues) */
  meta?: boolean;
  /** Texte clair (hero desktop overlay) */
  onDark?: boolean;
}

function formatLikeCount(count: number): string {
  if (count < 1000) return String(count);
  if (count < 10_000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')} k`;
  return `${Math.round(count / 1000)} k`;
}

export function ArticleLikeButton({
  documentId,
  initialCount = 0,
  showCount = true,
  className,
  compact = false,
  meta = false,
  onDark = false,
}: ArticleLikeButtonProps) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(Math.max(0, initialCount));
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setCount(Math.max(0, initialCount));
  }, [initialCount, documentId]);

  useEffect(() => {
    setLiked(isArticleLiked(documentId));
    return subscribeToLikesChanges(() => {
      setLiked(isArticleLiked(documentId));
    });
  }, [documentId]);

  const toggle = useCallback(async () => {
    if (pending) return;
    const nextLiked = !liked;
    const previousCount = count;

    setLiked(nextLiked);
    setCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    setArticleLikedLocally(documentId, nextLiked);
    setPending(true);

    try {
      const res = await fetch(`/api/articles/${documentId}/likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked: nextLiked }),
      });
      const data = (await res.json()) as { likeCount?: number; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? 'Échec');
      }
      if (typeof data.likeCount === 'number' && Number.isFinite(data.likeCount)) {
        setCount(Math.max(0, data.likeCount));
      }
    } catch {
      setLiked(!nextLiked);
      setCount(previousCount);
      setArticleLikedLocally(documentId, !nextLiked);
    } finally {
      setPending(false);
    }
  }, [count, documentId, liked, pending]);

  if (meta) {
    return (
      <>
        <span
          aria-hidden
          className={onDark ? 'text-white/40' : 'text-muted-foreground/40'}
        >
          |
        </span>
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={pending}
          className={cn(
            'inline-flex items-center gap-1.5 transition-colors disabled:opacity-60',
            liked
              ? onDark
                ? 'text-white'
                : 'text-foreground'
              : onDark
                ? 'text-white/85 hover:text-white'
                : 'text-muted-foreground hover:text-foreground',
            className
          )}
          aria-label={liked ? 'Retirer mon j’aime' : 'J’aime cet article'}
          aria-pressed={liked}
        >
          <ThumbsUp
            className={cn('h-4 w-4 shrink-0', liked && 'fill-current')}
            strokeWidth={liked ? 2.25 : 2}
            aria-hidden
          />
          {showCount ? (
            <span className="tabular-nums">{formatLikeCount(count)}</span>
          ) : (
            <span className="sr-only">{liked ? 'Aimé' : 'J’aime'}</span>
          )}
        </button>
      </>
    );
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={pending}
        className={cn(
          'flex h-full w-full flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-semibold transition-colors disabled:opacity-60',
          liked ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
          className
        )}
        aria-label={liked ? 'Retirer mon j’aime' : 'J’aime cet article'}
        aria-pressed={liked}
      >
        <ThumbsUp
          className={cn('h-5 w-5', liked && 'fill-current')}
          strokeWidth={liked ? 2.25 : 2}
          aria-hidden
        />
        <span className="leading-none">
          {showCount && count > 0 ? formatLikeCount(count) : liked ? 'Aimé' : 'J’aime'}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={pending}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-60',
        liked
          ? 'border-foreground/25 bg-muted text-foreground'
          : 'border-border bg-background text-foreground hover:bg-muted/70',
        className
      )}
      aria-label={liked ? 'Retirer mon j’aime' : 'J’aime cet article'}
      aria-pressed={liked}
    >
      <ThumbsUp
        className={cn('h-4 w-4', liked && 'fill-current')}
        strokeWidth={liked ? 2.25 : 2}
        aria-hidden
      />
      <span>{liked ? 'Aimé' : 'J’aime'}</span>
      {showCount ? (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
            liked ? 'bg-background/80' : 'bg-muted text-muted-foreground'
          )}
        >
          {formatLikeCount(count)}
        </span>
      ) : null}
    </button>
  );
}
