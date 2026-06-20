'use client';

import { useEffect } from 'react';

const STORAGE_PREFIX = 'wab-view:';

interface ArticleViewTrackerProps {
  documentId: string;
  slug: string;
}

export function ArticleViewTracker({ documentId, slug }: ArticleViewTrackerProps) {
  useEffect(() => {
    if (!documentId || documentId.startsWith('mock-')) return;

    const key = `${STORAGE_PREFIX}${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      // sessionStorage indisponible (mode privé strict)
    }

    fetch(`/api/articles/${documentId}/views`, { method: 'POST' })
      .then((res) => {
        if (!res.ok) return;
        try {
          sessionStorage.setItem(key, '1');
        } catch {
          // ignore
        }
      })
      .catch(() => undefined);
  }, [documentId, slug]);

  return null;
}
