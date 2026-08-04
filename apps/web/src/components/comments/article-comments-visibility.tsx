'use client';

import type { ReactNode } from 'react';
import { deviceVisibilityClass } from '@wab-infos/shared';
import { useSiteChrome } from '@/components/providers/site-chrome-context';
import { cn } from '@/lib/utils';

/** Affiche / masque le bloc commentaires selon les réglages Rédaction (desktop / mobile). */
export function ArticleCommentsVisibility({ children }: { children: ReactNode }) {
  const { chrome } = useSiteChrome();
  const visibility = chrome.articleUi.comments;
  if (!visibility.desktop && !visibility.mobile) return null;
  return (
    <div className={cn(deviceVisibilityClass(visibility), 'mt-10')}>
      {children}
    </div>
  );
}
