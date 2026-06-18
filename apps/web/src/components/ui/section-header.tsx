import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  color?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}

export function SectionHeader({
  title,
  color = 'var(--primary)',
  href,
  linkLabel = 'Voir tout',
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('mb-5 flex items-end justify-between gap-4', className)}>
      <div className="flex items-center gap-3">
        <div
          className="h-8 w-1 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <h2
          className="font-display text-xl font-bold tracking-tight md:text-2xl"
          style={{ color }}
        >
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
