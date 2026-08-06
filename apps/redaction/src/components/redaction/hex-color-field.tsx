'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { parseCssHexColor } from '@wab-infos/shared';

interface HexColorFieldProps {
  label: string;
  value: string;
  fallback: string;
  onChange: (hex: string) => void;
  ariaLabel?: string;
  trailing?: ReactNode;
}

/** Sélecteur couleur + saisie libre du code hex (#RGB / #RRGGBB). */
export function HexColorField({
  label,
  value,
  fallback,
  onChange,
  ariaLabel,
  trailing,
}: HexColorFieldProps) {
  const resolved = parseCssHexColor(value) ?? fallback;
  const [draft, setDraft] = useState(resolved.toUpperCase());

  useEffect(() => {
    setDraft(resolved.toUpperCase());
  }, [resolved]);

  return (
    <label className="block text-xs font-semibold text-foreground">
      {label}
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <input
          type="color"
          value={resolved}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-background p-1"
          aria-label={ariaLabel || label}
        />
        <input
          type="text"
          value={draft}
          spellCheck={false}
          autoComplete="off"
          placeholder={fallback.toUpperCase()}
          onChange={(e) => {
            const next = e.target.value.trim();
            setDraft(next);
            const parsed = parseCssHexColor(next);
            if (parsed) onChange(parsed);
          }}
          onBlur={() => {
            const parsed = parseCssHexColor(draft);
            if (parsed) {
              onChange(parsed);
              setDraft(parsed.toUpperCase());
              return;
            }
            setDraft(resolved.toUpperCase());
          }}
          className="h-10 min-w-[7.5rem] flex-1 rounded-xl border border-border bg-background px-3 font-mono text-sm uppercase tracking-wide text-foreground"
          aria-label={`${ariaLabel || label} — code hex`}
        />
        {trailing}
      </div>
    </label>
  );
}
