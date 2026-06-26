'use client';

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

function withOptionalFocus(editor: Editor) {
  const chain = editor.chain();
  if (editor.isFocused) chain.focus();
  return chain;
}

function Btn({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
        active ? 'bg-primary/15 text-primary' : 'text-foreground active:bg-muted'
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
  onLinkClick: () => void;
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
  onLinkClick,
  onEmbedClick,
  className,
}: ArticleEditorToolbarProps) {
  return (
    <div
      className={cn(
        'border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90',
        className
      )}
      role="toolbar"
      aria-label="Mise en forme"
    >
      <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {showDismissKeyboard && onDismissKeyboard ? (
          <>
            <Btn label="Masquer le clavier" onClick={onDismissKeyboard}>
              <ChevronDown className="h-[18px] w-[18px]" strokeWidth={2.5} />
            </Btn>
            <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden />
          </>
        ) : null}
        <Btn label="Plus de blocs" onClick={onBlocksClick}>
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </Btn>
        <Btn
          label="Séparateur"
          onClick={() => withOptionalFocus(editor).setHorizontalRule().run()}
        >
          <SeparatorHorizontal className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </Btn>

        <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden />

        <Btn
          label="Gras"
          active={editor.isActive('bold')}
          onClick={() => withOptionalFocus(editor).toggleBold().run()}
        >
          <Bold className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </Btn>
        <Btn
          label="Italique"
          active={editor.isActive('italic')}
          onClick={() => withOptionalFocus(editor).toggleItalic().run()}
        >
          <Italic className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </Btn>
        <Btn
          label="Souligné"
          active={editor.isActive('underline')}
          onClick={() => withOptionalFocus(editor).toggleUnderline().run()}
        >
          <UnderlineIcon className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </Btn>

        <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden />

        <Btn
          label="Style de titre"
          active={editor.isActive('heading')}
          onClick={onHeadingClick}
        >
          <span className="flex items-center gap-0.5 text-[11px] font-bold leading-none">
            <Heading2 className="h-4 w-4" strokeWidth={2.5} />
            {headingToolbarLabel(editor)}
          </span>
        </Btn>
        <Btn
          label="Citation"
          active={editor.isActive('blockquote')}
          onClick={() => withOptionalFocus(editor).toggleBlockquote().run()}
        >
          <Quote className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </Btn>
        <Btn
          label="Liste"
          active={editor.isActive('bulletList')}
          onClick={() => withOptionalFocus(editor).toggleBulletList().run()}
        >
          <List className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </Btn>
        <Btn
          label="Liste numérotée"
          active={editor.isActive('orderedList')}
          onClick={() => withOptionalFocus(editor).toggleOrderedList().run()}
        >
          <ListOrdered className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </Btn>

        <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden />

        <Btn label="Lien" active={editor.isActive('link')} onClick={onLinkClick}>
          <Link2 className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </Btn>
        <Btn label="Image" disabled={uploading} onClick={onImageClick}>
          {uploading ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" />
          ) : (
            <ImageIcon className="h-[18px] w-[18px]" strokeWidth={2.5} />
          )}
        </Btn>
        <Btn label="Vidéo ou réseau social" onClick={onEmbedClick}>
          <Video className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </Btn>
      </div>
    </div>
  );
}
