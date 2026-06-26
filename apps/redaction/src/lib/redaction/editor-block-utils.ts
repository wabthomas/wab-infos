import type { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';

export type EditorBlockType =
  | 'paragraph'
  | 'heading2'
  | 'heading3'
  | 'blockquote'
  | 'bulletList'
  | 'orderedList'
  | 'image'
  | 'horizontalRule'
  | 'youtube'
  | 'socialEmbed'
  | 'other';

export interface EditorBlockInfo {
  index: number;
  pos: number;
  node: ProseMirrorNode;
  type: EditorBlockType;
  label: string;
  dom: HTMLElement | null;
}

const BLOCK_LABELS: Record<EditorBlockType, string> = {
  paragraph: 'Paragraphe',
  heading2: 'Titre 2',
  heading3: 'Titre 3',
  blockquote: 'Citation',
  bulletList: 'Liste',
  orderedList: 'Liste numérotée',
  image: 'Image',
  horizontalRule: 'Séparateur',
  youtube: 'Vidéo',
  socialEmbed: 'Intégration',
  other: 'Bloc',
};

function resolveBlockType(node: ProseMirrorNode): EditorBlockType {
  const name = node.type.name;
  if (name === 'paragraph') return 'paragraph';
  if (name === 'heading' && node.attrs.level === 2) return 'heading2';
  if (name === 'heading' && node.attrs.level === 3) return 'heading3';
  if (name === 'blockquote') return 'blockquote';
  if (name === 'bulletList') return 'bulletList';
  if (name === 'orderedList') return 'orderedList';
  if (name === 'image') return 'image';
  if (name === 'horizontalRule') return 'horizontalRule';
  if (name === 'youtube') return 'youtube';
  if (name === 'socialEmbed') return 'socialEmbed';
  return 'other';
}

export function getBlockLabel(type: EditorBlockType): string {
  return BLOCK_LABELS[type];
}

export function getActiveBlockInfo(editor: Editor): EditorBlockInfo | null {
  const { doc, selection } = editor.state;
  const $from = doc.resolve(selection.from);
  if ($from.depth < 1) return null;

  const index = $from.index(0);
  const node = $from.node(1);
  const pos = $from.before(1);
  const dom = editor.view.nodeDOM(pos);
  const type = resolveBlockType(node);

  return {
    index,
    pos,
    node,
    type,
    label: getBlockLabel(type),
    dom: dom instanceof HTMLElement ? dom : null,
  };
}

export function moveBlock(editor: Editor, direction: 'up' | 'down'): boolean {
  const info = getActiveBlockInfo(editor);
  if (!info) return false;

  const { doc } = editor.state;
  const { index, node, pos } = info;
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= doc.childCount) return false;

  let targetPos = 0;
  doc.forEach((_, offset, i) => {
    if (i === targetIndex) targetPos = offset;
  });

  return editor
    .chain()
    .command(({ tr }) => {
      const from = pos;
      const to = pos + node.nodeSize;

      if (direction === 'up') {
        tr.delete(from, to);
        const insertAt = tr.mapping.map(targetPos);
        tr.insert(insertAt, node);
        tr.setSelection(TextSelection.near(tr.doc.resolve(insertAt + 1)));
      } else {
        const targetNode = doc.child(targetIndex);
        const targetEnd = targetPos + targetNode.nodeSize;
        tr.delete(from, to);
        const insertAt = tr.mapping.map(targetEnd) - node.nodeSize;
        tr.insert(insertAt, node);
        tr.setSelection(TextSelection.near(tr.doc.resolve(insertAt + 1)));
      }
      return true;
    })
    .focus()
    .run();
}

export function deleteActiveBlock(editor: Editor): boolean {
  const info = getActiveBlockInfo(editor);
  if (!info) return false;

  const from = info.pos;
  const to = from + info.node.nodeSize;

  return editor
    .chain()
    .command(({ tr, state }) => {
      tr.delete(from, to);
      if (tr.doc.childCount === 0) {
        tr.insert(1, state.schema.nodes.paragraph.create());
      }
      const nextPos = Math.min(from, tr.doc.content.size);
      tr.setSelection(TextSelection.near(tr.doc.resolve(nextPos)));
      return true;
    })
    .focus()
    .run();
}

export function setBlockHeading(editor: Editor, level: 2 | 3 | null): boolean {
  const chain = editor.chain().focus();
  if (level === null) {
    return chain.setParagraph().run();
  }
  return chain.setHeading({ level }).run();
}
