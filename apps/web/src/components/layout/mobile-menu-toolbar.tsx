'use client';

import { Settings2 } from 'lucide-react';
import { PushAlertsIconButton } from '@/components/layout/push-alerts-icon-button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';

interface MobileMenuToolbarProps {
  className?: string;
  onNavigate?: () => void;
  onOpenSettings?: () => void;
}

export function MobileMenuToolbar({
  className,
  onOpenSettings,
}: MobileMenuToolbarProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-1 border-b border-border bg-muted/30 px-3 py-2',
        className
      )}
      role="toolbar"
      aria-label="Raccourcis du menu"
    >
      <ThemeToggle labeled className="border-0 bg-transparent shadow-none" />
      <PushAlertsIconButton labeled />
      {onOpenSettings ? (
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-1.5 text-foreground transition-colors hover:bg-muted"
          aria-label="Ouvrir les réglages"
        >
          <Settings2 className="h-5 w-5" />
          <span className="text-[10px] font-semibold leading-none text-muted-foreground">
            Réglages
          </span>
        </button>
      ) : null}
    </div>
  );
}
