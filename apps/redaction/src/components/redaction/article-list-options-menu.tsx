'use client';

import Link from 'next/link';
import {
  ExternalLink,
  EyeOff,
  Loader2,
  MoreVertical,
  Pencil,
  Share2,
  Trash2,
  Upload,
} from 'lucide-react';

interface ArticleListOptionsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editHref: string;
  publicUrl?: string | null;
  canDelete?: boolean;
  canManagePublication?: boolean;
  showPublish?: boolean;
  showUnpublish?: boolean;
  deleting?: boolean;
  togglingPublication?: boolean;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
}

export function ArticleListOptionsMenu({
  open,
  onOpenChange,
  editHref,
  publicUrl,
  canDelete = false,
  canManagePublication = false,
  showPublish = false,
  showUnpublish = false,
  deleting = false,
  togglingPublication = false,
  onPublish,
  onUnpublish,
  onShare,
  onDelete,
}: ArticleListOptionsMenuProps) {
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
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
        aria-label="Options de l'article"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" />
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
            <Link
              href={editHref}
              onClick={close}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium active:bg-muted"
            >
              <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
              Modifier
            </Link>
            {canManagePublication && showPublish && onPublish ? (
              <button
                type="button"
                disabled={togglingPublication}
                onClick={() => run(onPublish)}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-primary active:bg-muted disabled:opacity-50"
              >
                {togglingPublication ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 shrink-0" />
                )}
                Publier
              </button>
            ) : null}
            {canManagePublication && showUnpublish && onUnpublish ? (
              <button
                type="button"
                disabled={togglingPublication}
                onClick={() => run(onUnpublish)}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-amber-700 active:bg-muted disabled:opacity-50 dark:text-amber-300"
              >
                {togglingPublication ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <EyeOff className="h-4 w-4 shrink-0" />
                )}
                Dépublier
              </button>
            ) : null}
            {publicUrl ? (
              <>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={close}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium active:bg-muted"
                >
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                  Voir sur le site
                </a>
                {onShare ? (
                  <button
                    type="button"
                    onClick={() => run(onShare)}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium active:bg-muted"
                  >
                    <Share2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    Partager
                  </button>
                ) : null}
              </>
            ) : null}
            {canDelete && onDelete ? (
              <button
                type="button"
                disabled={deleting}
                onClick={() => run(onDelete)}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-600 active:bg-red-50 disabled:opacity-50 dark:active:bg-red-950/40"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 shrink-0" />
                )}
                Supprimer
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
