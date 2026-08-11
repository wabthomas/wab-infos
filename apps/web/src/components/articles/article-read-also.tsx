'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Article } from '@wab-infos/shared';
import { ArrowUpRight } from 'lucide-react';
import { getArticlePath } from '@/config/site';
import { cn, resolveArticleImageUrl } from '@/lib/utils';

interface ArticleReadAlsoProps {
  article: Article;
  /** Index 0-based pour décaler légèrement l’animation d’entrée. */
  index?: number;
  /** Afficher la miniature (réglage site). */
  showThumbnail?: boolean;
}

/** Encart mid-article — suggestion d’un article similaire. */
export function ArticleReadAlso({
  article,
  index = 0,
  showThumbnail = true,
}: ArticleReadAlsoProps) {
  const href = getArticlePath(article);
  const imageUrl = showThumbnail
    ? resolveArticleImageUrl(article.featuredImage, 'card')
    : null;
  const categoryName = article.category?.name;
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <aside
      ref={ref}
      className={cn(
        'article-read-also not-prose my-9 sm:my-10',
        'read-also-reveal',
        visible && 'read-also-reveal--visible'
      )}
      style={{ '--read-also-delay': `${Math.min(index, 2) * 60}ms` } as CSSProperties}
      aria-label="Lire aussi"
    >
      <Link
        href={href}
        className="group relative flex items-stretch gap-0 overflow-hidden rounded-2xl bg-muted/40 ring-1 ring-border/70 transition-[box-shadow,background-color,ring-color] duration-300 hover:bg-muted/70 hover:shadow-md hover:ring-primary/25 dark:bg-muted/25 dark:hover:bg-muted/40"
      >
        {imageUrl ? (
          <div className="article-read-also__thumb relative w-[5.5rem] shrink-0 self-stretch overflow-hidden sm:w-28">
            <Image
              src={imageUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              sizes="112px"
              unoptimized
            />
            <span
              className="absolute inset-0 bg-gradient-to-r from-transparent to-muted/30 dark:to-background/20"
              aria-hidden
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              <span className="inline-block h-1 w-1 rounded-full bg-primary" aria-hidden />
              Lire aussi
            </p>
            <p className="font-display mt-1.5 text-[0.95rem] font-semibold leading-snug tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary sm:text-base">
              {article.title}
            </p>
            {categoryName ? (
              <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">{categoryName}</p>
            ) : null}
          </div>

          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background/80 text-muted-foreground ring-1 ring-border/80 transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary"
            aria-hidden
          >
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </Link>
    </aside>
  );
}
