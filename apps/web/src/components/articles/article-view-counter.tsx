'use client';

import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatViewCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace('.0', '')} M vues`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace('.0', '')} k vues`;
  }
  return `${count} vues`;
}

interface ArticleViewCounterProps {
  documentId: string;
  slug: string;
  categorySlug: string;
  initialCount: number;
  className?: string;
}

const STORAGE_PREFIX = 'wab-view:';

export function ArticleViewCounter({
  documentId,
  slug,
  categorySlug,
  initialCount,
  className,
}: ArticleViewCounterProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!documentId || documentId.startsWith('mock-')) return;

    const key = `${STORAGE_PREFIX}${slug}`;
    let alreadyCounted = false;
    try {
      alreadyCounted = sessionStorage.getItem(key) === '1';
    } catch {
      // sessionStorage indisponible
    }

    if (alreadyCounted) return;

    fetch(`/api/articles/${documentId}/views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, category: categorySlug }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ viewCount?: number }>;
      })
      .then((data) => {
        if (data?.viewCount != null) {
          setCount(data.viewCount);
        }
        try {
          sessionStorage.setItem(key, '1');
        } catch {
          // ignore
        }
      })
      .catch(() => undefined);
  }, [documentId, slug, categorySlug]);

  if (count <= 0) return null;

  return (
    <>
      <span aria-hidden className="text-muted-foreground/40 md:text-white/40">
        |
      </span>
      <span className={cn('inline-flex items-center gap-1.5', className)}>
        <Eye className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
        {formatViewCount(count)}
      </span>
    </>
  );
}
