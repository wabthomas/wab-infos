'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { SmartSearch } from '@/components/search/smart-search';
import { MobileSearchSheet } from '@/components/search/mobile-search-sheet';
import { cn } from '@/lib/utils';

interface HeaderSearchProps {
  className?: string;
  compact?: boolean;
  onSubmit?: () => void;
}

export function HeaderSearch({ className, compact = false, onSubmit }: HeaderSearchProps) {
  const [open, setOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

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

  return (
    <>
      {/* Mobile / APK : loupe → overlay plein écran (portal) */}
      <button
        type="button"
        onClick={() => setMobileSheetOpen(true)}
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground/80 transition-colors hover:bg-muted hover:text-foreground md:hidden',
          className
        )}
        aria-label="Ouvrir la recherche"
      >
        <Search className="h-5 w-5" />
      </button>
      <MobileSearchSheet open={mobileSheetOpen} onClose={() => setMobileSheetOpen(false)} />

      {/* Desktop : expansion inline dans le header */}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'hidden items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground sm:px-3 md:inline-flex',
            className
          )}
          aria-label="Ouvrir la recherche"
        >
          <Search className="h-4 w-4" />
          <span>Rechercher</span>
        </button>
      ) : (
        <div
          className={cn(
            'hidden min-w-0 flex-1 items-center gap-1 sm:max-w-xs md:flex md:max-w-sm',
            className
          )}
        >
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
      )}
    </>
  );
}
