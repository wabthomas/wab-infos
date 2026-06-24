'use client';

import { HeaderAuthLink } from '@/components/layout/header-auth-link';
import { PushAlertsIconButton } from '@/components/layout/push-alerts-icon-button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';

interface MobileMenuToolbarProps {
  className?: string;
  onNavigate?: () => void;
}

export function MobileMenuToolbar({ className, onNavigate }: MobileMenuToolbarProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-1 border-b border-border bg-muted/30 px-3 py-2',
        className
      )}
      role="toolbar"
      aria-label="Raccourcis du menu"
    >
      <HeaderAuthLink variant="labeled" onNavigate={onNavigate} />
      <ThemeToggle labeled className="border-0 bg-transparent shadow-none" />
      <PushAlertsIconButton labeled />
    </div>
  );
}
