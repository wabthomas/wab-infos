import type { Article } from '@wab-infos/shared';
import Link from 'next/link';
import { Zap } from 'lucide-react';

interface BreakingNewsTickerProps {
  articles: Article[];
}

export function BreakingNewsTicker({ articles }: BreakingNewsTickerProps) {
  if (!articles.length) return null;

  return (
    <div className="relative overflow-hidden border-b border-primary/30 bg-primary text-primary-foreground">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.15)_0%,transparent_50%,rgb(0_0_0/0.1)_100%)]" />
      <div className="container relative mx-auto flex items-center gap-3 px-4 py-2.5">
        <div className="flex shrink-0 items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-white" />
          </span>
          <Zap className="h-3.5 w-3.5" />
          Flash
        </div>
        <div className="overflow-hidden">
          <div className="animate-ticker flex gap-10 whitespace-nowrap">
            {[...articles, ...articles].map((article, i) => (
              <Link
                key={`${article.id}-${i}`}
                href={`/${article.category?.slug ?? 'actualites'}/${article.slug}`}
                className="text-sm font-medium transition-opacity hover:opacity-80 hover:underline"
              >
                {article.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
