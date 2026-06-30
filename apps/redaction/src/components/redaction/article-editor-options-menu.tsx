'use client';

import { ImageIcon, MoreVertical, Settings2, Trash2 } from 'lucide-react';

interface ArticleEditorOptionsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings: () => void;
  onOpenFeaturedImage: () => void;
  onSaveDraft: () => void;
  onDelete?: () => void;
  savingDraft?: boolean;
  deleting?: boolean;
  canDelete?: boolean;
  hasFeaturedImage?: boolean;
}

export function ArticleEditorOptionsMenu({
  open,
  onOpenChange,
  onOpenSettings,
  onOpenFeaturedImage,
  onSaveDraft,
  onDelete,
  savingDraft = false,
  deleting = false,
  canDelete = false,
  hasFeaturedImage = false,
}: ArticleEditorOptionsMenuProps) {
  function close() {
    onOpenChange(false);
  }

  function run(action: () => void) {
    close();
    action();
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
        aria-label="Options de l'article"
        aria-expanded={open}
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Fermer le menu"
            onClick={close}
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg">
            <button
              type="button"
              onClick={() => run(onOpenSettings)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium active:bg-muted"
            >
              <Settings2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              Réglages de l&apos;article
            </button>
            <button
              type="button"
              onClick={() => run(onOpenFeaturedImage)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium active:bg-muted"
            >
              <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              {hasFeaturedImage ? 'Modifier la photo' : 'Photo à la une'}
            </button>
            <button
              type="button"
              disabled={savingDraft}
              onClick={() => run(onSaveDraft)}
              className="flex w-full px-4 py-2.5 text-left text-sm font-medium active:bg-muted disabled:opacity-50"
            >
              {savingDraft ? 'Enregistrement…' : 'Enregistrer brouillon'}
            </button>
            {canDelete && onDelete ? (
              <button
                type="button"
                disabled={deleting}
                onClick={() => run(onDelete)}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-600 active:bg-red-50 disabled:opacity-50 dark:active:bg-red-950/40"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                {deleting ? 'Suppression…' : 'Supprimer l’article'}
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
