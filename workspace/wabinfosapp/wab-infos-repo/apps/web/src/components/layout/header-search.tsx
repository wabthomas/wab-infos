'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { SmartSearch } from '@/components/search/smart-search';
import { cn } from '@/lib/utils';

interface HeaderSearchProps {
  className?: string;
  compact?: boolean;
  onSubmit?: () => void;
}

export function HeaderSearch({ className, compact = false, onSubmit }: HeaderSearchProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!compact) setOpen(false);
  }, [compact]);

  if (compact) {
    return (
      <SmartSearch
        className={className}
        variant="compact"
        placeholder="Rechercher un article..."
        autoFocus
        onSubmit={onSubmit}
      />
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground sm:px-3',
          className
        )}
        aria-label="Ouvrir la recherche"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Rechercher</span>
      </button>
    );
  }

  return (
    <div className={cn('flex min-w-0 flex-1 items-center gap-1 sm:max-w-xs md:max-w-sm', className)}>
      <SmartSearch
        className="min-w-0 flex-1"
        variant="header"
        placeholder="Rechercher..."
        autoFocus
        onSubmit={() => {
          setOpen(false);
          onSubmit?.();
        }}
      />
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Fermer la recherche"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
