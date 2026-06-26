'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import {
  deleteActiveBlock,
  getActiveBlockInfo,
  moveBlock,
  type EditorBlockInfo,
} from '@/lib/redaction/editor-block-utils';
import { cn } from '@/lib/utils';

interface EditorBlockToolbarProps {
  editor: Editor;
  onHeadingClick: () => void;
}

export function EditorBlockToolbar({ editor, onHeadingClick }: EditorBlockToolbarProps) {
  const [block, setBlock] = useState<EditorBlockInfo | null>(null);
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const update = () => {
      if (!editor.isFocused) {
        setBlock(null);
        setStyle({});
        return;
      }
      const info = getActiveBlockInfo(editor);
      setBlock(info);
      if (!info?.dom) {
        setStyle({});
        return;
      }
      const rect = info.dom.getBoundingClientRect();
      setStyle({
        top: rect.top + 6,
        left: Math.max(8, rect.left + 6),
      });
    };

    update();
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    editor.on('focus', update);
    editor.on('blur', update);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);

    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
      editor.off('focus', update);
      editor.off('blur', update);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [editor]);

  if (!mounted || !block?.dom) return null;

  const canMoveUp = block.index > 0;
  const canMoveDown = block.index < editor.state.doc.childCount - 1;

  return createPortal(
    <div className="editor-block-toolbar" style={style} contentEditable={false}>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onHeadingClick}
        className="editor-block-toolbar__type"
        aria-label="Changer le type de bloc"
      >
        {block.label}
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        disabled={!canMoveUp}
        onClick={() => moveBlock(editor, 'up')}
        className={cn('editor-block-toolbar__btn', !canMoveUp && 'opacity-30')}
        aria-label="Monter le bloc"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        disabled={!canMoveDown}
        onClick={() => moveBlock(editor, 'down')}
        className={cn('editor-block-toolbar__btn', !canMoveDown && 'opacity-30')}
        aria-label="Descendre le bloc"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => deleteActiveBlock(editor)}
        className="editor-block-toolbar__btn text-red-600"
        aria-label="Supprimer le bloc"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>,
    document.body
  );
}
