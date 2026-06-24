'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bookmark, BookmarkCheck, Check, Share2 } from 'lucide-react';
import {
  isArticleFavorite,
  subscribeToFavoritesChanges,
  toggleArticleFavorite,
} from '@/lib/article-favorites';
import { sharePage } from '@/lib/share';
import { useAutoHideOnScroll } from '@/hooks/use-auto-hide-on-scroll';
import { cn } from '@/lib/utils';

interface MobileArticleBottomBarProps {
  documentId: string;
  slug: string;
  title: string;
  url: string;
  categorySlug: string;
}

export function MobileArticleBottomBar({
  documentId,
  slug,
  title,
  url,
  categorySlug,
}: MobileArticleBottomBarProps) {
  const router = useRouter();
  const visible = useAutoHideOnScroll();
  const [isFavorite, setIsFavorite] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    setIsFavorite(isArticleFavorite(documentId));
    return subscribeToFavoritesChanges(() => {
      setIsFavorite(isArticleFavorite(documentId));
    });
  }, [documentId]);

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(`/${categorySlug}`);
  }, [router, categorySlug]);

  const handleShare = useCallback(async () => {
    const result = await sharePage(title, url);
    if (result === 'copied') {
      setShareState('copied');
      window.setTimeout(() => setShareState('idle'), 2000);
    }
  }, [title, url]);

  const handleFavorite = useCallback(() => {
    const saved = toggleArticleFavorite({
      documentId,
      slug,
      title,
      url,
      categorySlug,
    });
    setIsFavorite(saved);
  }, [documentId, slug, title, url, categorySlug]);

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_-4px_rgb(0_0_0/0.08)] backdrop-blur-md supports-[backdrop-filter]:bg-background/90 transition-transform duration-300 ease-out md:hidden',
        visible ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      )}
      aria-label="Actions article"
      aria-hidden={!visible}
    >
      <ul className="mx-auto grid h-[3.75rem] max-w-lg grid-cols-3">
        <li>
          <button
            type="button"
            onClick={handleBack}
            className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
            <span className="leading-none">Retour</span>
          </button>
        </li>

        <li>
          <button
            type="button"
            onClick={handleShare}
            className={cn(
              'flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition-colors',
              shareState === 'copied' ? 'text-emerald-600' : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label={shareState === 'copied' ? 'Lien copié' : 'Partager cet article'}
          >
            {shareState === 'copied' ? (
              <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            ) : (
              <Share2 className="h-5 w-5" strokeWidth={2} aria-hidden />
            )}
            <span className="leading-none">{shareState === 'copied' ? 'Copié' : 'Partager'}</span>
          </button>
        </li>

        <li>
          <button
            type="button"
            onClick={handleFavorite}
            className={cn(
              'flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition-colors',
              isFavorite ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            aria-pressed={isFavorite}
          >
            {isFavorite ? (
              <BookmarkCheck className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            ) : (
              <Bookmark className="h-5 w-5" strokeWidth={2} aria-hidden />
            )}
            <span className="leading-none">{isFavorite ? 'Favori' : 'Favoris'}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
