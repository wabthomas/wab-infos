'use client';

import { useEffect, useReducer } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  ChevronDown,
  Heading2,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Plus,
  Quote,
  SeparatorHorizontal,
  Underline as UnderlineIcon,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKeepEditorFocusActivate } from '@/lib/redaction/keep-editor-focus';

/** Toujours recentrer TipTap sans scroll — sinon les outils échouent dès que le focus a quitté l’éditeur (ex. mobile). */
function runCommand(
  editor: Editor,
  apply: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>
) {
  return apply(editor.chain().focus(undefined, { scrollIntoView: false })).run();
}

function Btn({
  active,
  disabled,
  label,
  onClick,
  className,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const activate = useKeepEditorFocusActivate(onClick);
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      {...activate}
      className={cn(
        'flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-lg transition-colors',
        'disabled:pointer-events-none disabled:opacity-40',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-foreground/85 active:bg-muted lg:hover:bg-muted lg:hover:text-foreground',
        className
      )}
    >
      {children}
    </button>
  );
}

function Group({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-0.5 rounded-xl bg-muted/55 p-0.5 ring-1 ring-border/60',
        className
      )}
    >
      {children}
    </div>
  );
}

function LinkImageToolbarButton({
  label,
  pressed,
  disabled,
  onActivate,
  onPointerDownExtra,
  className,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onActivate: () => void;
  onPointerDownExtra?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const activate = useKeepEditorFocusActivate(onActivate, onPointerDownExtra);
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      {...activate}
      className={cn(
        'flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-lg transition-colors',
        'disabled:pointer-events-none disabled:opacity-40',
        className
      )}
    >
      {children}
    </button>
  );
}

function headingToolbarLabel(editor: Editor): string {
  if (editor.isActive('heading', { level: 2 })) return 'T2';
  if (editor.isActive('heading', { level: 3 })) return 'T3';
  return 'Aa';
}

export interface ArticleEditorToolbarProps {
  editor: Editor;
  uploading?: boolean;
  showDismissKeyboard?: boolean;
  onDismissKeyboard?: () => void;
  onBlocksClick: () => void;
  onHeadingClick: () => void;
  onImageClick: () => void;
  onImagePointerDown?: () => void;
  onLinkClick: () => void;
  onLinkPointerDown?: () => void;
  onEmbedClick: () => void;
  className?: string;
}

export function ArticleEditorToolbar({
  editor,
  uploading,
  showDismissKeyboard,
  onDismissKeyboard,
  onBlocksClick,
  onHeadingClick,
  onImageClick,
  onImagePointerDown,
  onLinkClick,
  onLinkPointerDown,
  onEmbedClick,
  className,
}: ArticleEditorToolbarProps) {
  const [, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    let frame = 0;
    const onUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        bump();
      });
    };
    editor.on('selectionUpdate', onUpdate);
    editor.on('transaction', onUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      editor.off('selectionUpdate', onUpdate);
      editor.off('transaction', onUpdate);
    };
  }, [editor]);

  return (
    <div
      className={cn(
        'border-t border-border/80 bg-background/95 shadow-[0_-6px_24px_rgba(0,0,0,0.06)] backdrop-blur-md supports-[backdrop-filter]:bg-background/90',
        className
      )}
      role="toolbar"
      aria-label="Mise en forme"
    >
      <div className="flex items-center gap-1.5 overflow-x-auto px-2.5 py-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap lg:justify-center lg:gap-2 lg:overflow-visible lg:px-4 [&::-webkit-scrollbar]:hidden">
        {showDismissKeyboard && onDismissKeyboard ? (
          <Btn label="Masquer le clavier" onClick={onDismissKeyboard}>
            <ChevronDown className="h-[18px] w-[18px]" strokeWidth={2.25} />
          </Btn>
        ) : null}

        <Btn
          label="Ajouter un bloc"
          onClick={onBlocksClick}
          className="bg-primary text-primary-foreground shadow-sm shadow-primary/25 lg:hover:bg-primary/90 lg:hover:text-primary-foreground"
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </Btn>

        <Group>
          <Btn
            label="Gras"
            active={editor.isActive('bold')}
            onClick={() => runCommand(editor, (c) => c.toggleBold())}
          >
            <Bold className="h-[17px] w-[17px]" strokeWidth={2.5} />
          </Btn>
          <Btn
            label="Italique"
            active={editor.isActive('italic')}
            onClick={() => runCommand(editor, (c) => c.toggleItalic())}
          >
            <Italic className="h-[17px] w-[17px]" strokeWidth={2.5} />
          </Btn>
          <Btn
            label="Souligné"
            active={editor.isActive('underline')}
            onClick={() => runCommand(editor, (c) => c.toggleUnderline())}
          >
            <UnderlineIcon className="h-[17px] w-[17px]" strokeWidth={2.5} />
          </Btn>
        </Group>

        <Group>
          <Btn
            label="Style de titre"
            active={editor.isActive('heading')}
            onClick={onHeadingClick}
            className="w-auto min-w-10 gap-0.5 px-2"
          >
            <Heading2 className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span className="text-[11px] font-bold tracking-wide">{headingToolbarLabel(editor)}</span>
          </Btn>
          <Btn
            label="Citation"
            active={editor.isActive('blockquote')}
            onClick={() => runCommand(editor, (c) => c.toggleBlockquote())}
          >
            <Quote className="h-[17px] w-[17px]" strokeWidth={2.5} />
          </Btn>
          <Btn
            label="Liste"
            active={editor.isActive('bulletList')}
            onClick={() => runCommand(editor, (c) => c.toggleBulletList())}
          >
            <List className="h-[17px] w-[17px]" strokeWidth={2.5} />
          </Btn>
          <Btn
            label="Liste numérotée"
            active={editor.isActive('orderedList')}
            onClick={() => runCommand(editor, (c) => c.toggleOrderedList())}
          >
            <ListOrdered className="h-[17px] w-[17px]" strokeWidth={2.5} />
          </Btn>
        </Group>

        <Group>
          <LinkImageToolbarButton
            label="Lien"
            pressed={editor.isActive('link')}
            onActivate={onLinkClick}
            onPointerDownExtra={onLinkPointerDown}
            className={
              editor.isActive('link')
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground/85 active:bg-muted lg:hover:bg-muted lg:hover:text-foreground'
            }
          >
            <Link2 className="h-[17px] w-[17px]" strokeWidth={2.5} />
          </LinkImageToolbarButton>
          <LinkImageToolbarButton
            label="Image"
            disabled={uploading}
            onActivate={onImageClick}
            onPointerDownExtra={onImagePointerDown}
            className="text-foreground/85 active:bg-muted lg:hover:bg-muted lg:hover:text-foreground"
          >
            {uploading ? (
              <Loader2 className="h-[17px] w-[17px] animate-spin" />
            ) : (
              <ImageIcon className="h-[17px] w-[17px]" strokeWidth={2.5} />
            )}
          </LinkImageToolbarButton>
          <Btn label="Vidéo ou réseau social" onClick={onEmbedClick}>
            <Video className="h-[17px] w-[17px]" strokeWidth={2.5} />
          </Btn>
          <Btn
            label="Séparateur"
            onClick={() => runCommand(editor, (c) => c.setHorizontalRule())}
          >
            <SeparatorHorizontal className="h-[17px] w-[17px]" strokeWidth={2.5} />
          </Btn>
        </Group>
      </div>
    </div>
  );
}
