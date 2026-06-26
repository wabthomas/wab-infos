'use client';

import type { Editor } from '@tiptap/react';
import { Heading2, Heading3, Pilcrow, X } from 'lucide-react';
import { setBlockHeading } from '@/lib/redaction/editor-block-utils';
import { cn } from '@/lib/utils';

interface ArticleHeadingPickerProps {
  editor: Editor;
  open: boolean;
  onClose: () => void;
  bottomOffset?: number;
}

const OPTIONS = [
  { id: 'paragraph', label: 'Paragraphe', icon: Pilcrow, level: null as null },
  { id: 'h2', label: 'Titre 2', icon: Heading2, level: 2 as const },
  { id: 'h3', label: 'Titre 3', icon: Heading3, level: 3 as const },
] as const;

export function ArticleHeadingPicker({
  editor,
  open,
  onClose,
  bottomOffset = 0,
}: ArticleHeadingPickerProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-x-0 z-[68] border-t border-border bg-background px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
      style={{
        bottom: bottomOffset > 0 ? bottomOffset : undefined,
        paddingBottom: bottomOffset > 0 ? '0.75rem' : 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="mx-auto max-w-lg">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Style de titre</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {OPTIONS.map(({ id, label, icon: Icon, level }) => {
            const active =
              level === null
                ? editor.isActive('paragraph')
                : editor.isActive('heading', { level });
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setBlockHeading(editor, level);
                  onClose();
                }}
                className={cn(
                  'rounded-xl border px-2 py-3 text-center text-xs font-semibold active:bg-muted',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground'
                )}
              >
                <Icon className="mx-auto mb-1 h-5 w-5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
