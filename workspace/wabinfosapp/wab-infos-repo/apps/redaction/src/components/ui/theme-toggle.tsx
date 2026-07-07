'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeToggle({
  className,
  labeled = false,
}: {
  className?: string;
  labeled?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={cn(labeled ? 'h-14 w-full' : 'h-9 w-9', className)} />;
  }

  const isDark = theme === 'dark';
  const label = isDark ? 'Mode clair' : 'Mode sombre';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        labeled
          ? 'flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-1.5 text-foreground transition-colors hover:bg-muted'
          : 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-muted',
        className
      )}
      aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      {labeled && (
        <span className="text-[10px] font-semibold leading-none text-muted-foreground">{label}</span>
      )}
    </button>
  );
}
