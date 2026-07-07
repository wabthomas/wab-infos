'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light', label: 'Clair', icon: Sun },
  { value: 'dark', label: 'Sombre', icon: Moon },
  { value: 'system', label: 'Système', icon: Monitor },
] as const;

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Apparence</p>
      <p className="mt-1 text-sm text-muted-foreground">Mode clair ou sombre</p>
      {!mounted ? (
        <div className="mt-4 h-16 rounded-xl bg-muted" />
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-xs font-semibold transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
