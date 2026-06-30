'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Youtube from '@tiptap/extension-youtube';
import {
  Braces,
  Heading2,
  Heading3,
  ImageIcon,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pilcrow,
  Quote,
  SeparatorHorizontal,
  Video,
  X,
} from 'lucide-react';
import { parseEmbedUrl, youtubeWatchUrl } from '@/lib/redaction/embed-urls';
import { readApiJsonResponse } from '@/lib/redaction/api-response';
import { compressClientImage } from '@/lib/redaction/compress-client-image';
import { IMAGE_UPLOAD_ACCEPT } from '@/lib/redaction/image-upload-accept';
import { BlockChrome } from '@/lib/redaction/tiptap-block-chrome';
import { SocialEmbed } from '@/lib/redaction/tiptap-social-embed';
import { ArticleEditorToolbar } from '@/components/redaction/article-editor-toolbar';
import { ArticleHeadingPicker } from '@/components/redaction/article-heading-picker';
import { EditorBlockToolbar } from '@/components/redaction/editor-block-toolbar';

interface ArticleRichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onEditorReady?: (editor: Editor) => void;
  onKeyboardInsetChange?: (inset: number) => void;
}

type SheetMode = 'link' | 'embed' | null;
type BlockMode = 'closed' | 'blocks';
type HeadingMode = 'closed' | 'open';

export function ArticleRichEditor({
  value,
  onChange,
  placeholder = 'Commencez à écrire…',
  onEditorReady,
  onKeyboardInsetChange,
}: ArticleRichEditorProps) {
  const [sheet, setSheet] = useState<SheetMode>(null);
  const [blockSheet, setBlockSheet] = useState<BlockMode>('closed');
  const [headingSheet, setHeadingSheet] = useState<HeadingMode>('closed');
  const [inputValue, setInputValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [editorFocused, setEditorFocused] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef(value);

  const editorPlaceholder = useCallback(
    ({ editor: ed }: { editor: Editor }) => {
      const { doc } = ed.state;
      const first = doc.firstChild;
      const isOnlyEmptyParagraph =
        doc.childCount === 1 &&
        first?.type.name === 'paragraph' &&
        first.content.size === 0;
      return isOnlyEmptyParagraph ? placeholder : '';
    },
    [placeholder]
  );

  const editor = useEditor({
    immediatelyRender: false,
    autofocus: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        blockquote: {},
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Image.configure({
        HTMLAttributes: { class: 'article-inline-image' },
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        nocookie: true,
        HTMLAttributes: { class: 'article-youtube-embed' },
      }),
      SocialEmbed,
      Placeholder.configure({ placeholder: editorPlaceholder }),
      BlockChrome,
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'redaction-editor-prose jetpack-editor-body jetpack-blocks outline-none',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
    onFocus: () => setEditorFocused(true),
    onBlur: () => setEditorFocused(false),
  });

  useEffect(() => {
    if (!editor) return;
    onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateInset = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      const next = inset > 20 ? inset : 0;
      setKeyboardInset(next);
      onKeyboardInsetChange?.(next);
    };

    updateInset();
    viewport.addEventListener('resize', updateInset);
    viewport.addEventListener('scroll', updateInset);
    return () => {
      viewport.removeEventListener('resize', updateInset);
      viewport.removeEventListener('scroll', updateInset);
    };
  }, [onKeyboardInsetChange]);

  const dismissKeyboard = useCallback(() => {
    editor?.commands.blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setEditorFocused(false);
  }, [editor]);

  const toolbarBottom = keyboardInset > 0 ? keyboardInset : 0;
  const showDismissKeyboard = editorFocused || keyboardInset > 0;

  useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;
    if (editor.getHTML() === value) return;
    editor.commands.setContent(value || '', false);
    lastEmitted.current = value;
  }, [editor, value]);

  const closeSheet = useCallback(() => {
    setSheet(null);
    setInputValue('');
    setError('');
  }, []);

  const closeBlockSheet = useCallback(() => {
    setBlockSheet('closed');
  }, []);

  const closeHeadingSheet = useCallback(() => {
    setHeadingSheet('closed');
  }, []);

  const openHeadingSheet = useCallback(() => {
    closeSheet();
    closeBlockSheet();
    setHeadingSheet((value) => (value === 'open' ? 'closed' : 'open'));
  }, [closeBlockSheet, closeSheet]);

  const insertBlock = useCallback(
    (action: () => void) => {
      action();
      closeBlockSheet();
    },
    [closeBlockSheet]
  );

  const applyLink = useCallback(() => {
    if (!editor) return;
    const url = inputValue.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      closeSheet();
      return;
    }
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    closeSheet();
  }, [closeSheet, editor, inputValue]);

  const applyEmbed = useCallback(() => {
    if (!editor) return;
    const parsed = parseEmbedUrl(inputValue);
    if (!parsed) {
      setError('Lien non reconnu (YouTube, X/Twitter ou Facebook).');
      return;
    }
    let ok = false;
    if (parsed.platform === 'youtube' && parsed.youtubeId) {
      ok = editor
        .chain()
        .focus()
        .setYoutubeVideo({ src: youtubeWatchUrl(parsed.youtubeId) })
        .run();
    } else {
      ok = editor
        .chain()
        .focus()
        .setSocialEmbed({
          platform: parsed.platform,
          url: parsed.url,
          embedUrl: parsed.embedUrl,
        })
        .run();
    }
    if (!ok) {
      setError('Impossible d’insérer cette vidéo ou intégration.');
      return;
    }
    closeSheet();
  }, [closeSheet, editor, inputValue]);

  const uploadImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      setUploading(true);
      setError('');
      try {
        const prepared = await compressClientImage(file);
        const form = new FormData();
        form.append('file', prepared);
        const res = await fetch('/api/redaction/upload', { method: 'POST', body: form });
        const data = await readApiJsonResponse<{ media?: { url: string }; error?: string }>(res);
        if (!res.ok) throw new Error(data.error ?? 'Upload échoué');
        const src = data.media!.url.startsWith('http')
          ? data.media!.url
          : data.media!.url.startsWith('/')
            ? data.media!.url
            : `/${data.media!.url}`;
        editor.chain().focus().setImage({ src, alt: '' }).run();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload échoué');
      } finally {
        setUploading(false);
      }
    },
    [editor]
  );

  if (!editor) {
    return (
      <div className="flex min-h-[40dvh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sheetBottom =
    toolbarBottom > 0
      ? toolbarBottom + (headingSheet === 'open' ? 52 : 0)
      : undefined;

  return (
    <>
      <EditorContent editor={editor} />
      <EditorBlockToolbar editor={editor} onHeadingClick={openHeadingSheet} />

      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadImage(file);
          e.target.value = '';
        }}
      />

      {sheet && (
        <div
          className="fixed inset-x-0 z-[70] border-t border-border bg-background px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
          style={{
            bottom: sheetBottom,
            paddingBottom: toolbarBottom > 0 ? '0.75rem' : 'max(0.75rem, env(safe-area-inset-bottom))',
          }}
        >
          <div className="mx-auto max-w-lg">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                {sheet === 'link' ? 'Insérer un lien' : 'Intégrer une vidéo ou un post'}
              </p>
              <button
                type="button"
                onClick={closeSheet}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="url"
              inputMode="url"
              autoComplete="off"
              autoFocus
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError('');
              }}
              placeholder={
                sheet === 'link'
                  ? 'https://exemple.com'
                  : 'Lien YouTube, X/Twitter ou Facebook'
              }
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-base outline-none focus:border-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (sheet === 'link') applyLink();
                  else applyEmbed();
                }
              }}
            />
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={closeSheet}
                className="h-10 flex-1 rounded-xl border border-border text-sm font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={sheet === 'link' ? applyLink : applyEmbed}
                className="h-10 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
              >
                {sheet === 'link' ? 'Appliquer' : 'Intégrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {blockSheet === 'blocks' && (
        <div
          className="fixed inset-x-0 z-[65] border-t border-border bg-background px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
          style={{
            bottom:
              toolbarBottom > 0
                ? toolbarBottom + 52
                : 'calc(3.9rem + env(safe-area-inset-bottom))',
          }}
        >
          <div className="mx-auto max-w-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Ajouter un bloc</p>
              <button
                type="button"
                onClick={closeBlockSheet}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                aria-label="Fermer les blocs"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid max-h-[42dvh] grid-cols-3 gap-2 overflow-y-auto text-center text-xs font-medium">
              <button
                type="button"
                onClick={() =>
                  insertBlock(() => editor.chain().focus().setParagraph().run())
                }
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <Pilcrow className="mx-auto mb-1 h-5 w-5" />
                Paragraphe
              </button>
              <button
                type="button"
                onClick={() =>
                  insertBlock(() => editor.chain().focus().setHeading({ level: 2 }).run())
                }
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <Heading2 className="mx-auto mb-1 h-5 w-5" />
                Titre 2
              </button>
              <button
                type="button"
                onClick={() =>
                  insertBlock(() => editor.chain().focus().setHeading({ level: 3 }).run())
                }
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <Heading3 className="mx-auto mb-1 h-5 w-5" />
                Titre 3
              </button>
              <button
                type="button"
                onClick={() =>
                  insertBlock(() => editor.chain().focus().toggleBulletList().run())
                }
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <List className="mx-auto mb-1 h-5 w-5" />
                Liste
              </button>
              <button
                type="button"
                onClick={() =>
                  insertBlock(() => editor.chain().focus().toggleOrderedList().run())
                }
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <ListOrdered className="mx-auto mb-1 h-5 w-5" />
                Liste num.
              </button>
              <button
                type="button"
                onClick={() =>
                  insertBlock(() => editor.chain().focus().toggleBlockquote().run())
                }
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <Quote className="mx-auto mb-1 h-5 w-5" />
                Citation
              </button>
              <button
                type="button"
                onClick={() => {
                  closeBlockSheet();
                  fileRef.current?.click();
                }}
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <ImageIcon className="mx-auto mb-1 h-5 w-5" />
                Image
              </button>
              <button
                type="button"
                onClick={() =>
                  insertBlock(() => editor.chain().focus().setHorizontalRule().run())
                }
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <SeparatorHorizontal className="mx-auto mb-1 h-5 w-5" />
                Séparateur
              </button>
              <button
                type="button"
                onClick={() => {
                  closeBlockSheet();
                  setInputValue('');
                  setSheet('embed');
                }}
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <Video className="mx-auto mb-1 h-5 w-5" />
                Vidéo
              </button>
              <button
                type="button"
                onClick={() => {
                  closeBlockSheet();
                  const prev = editor.getAttributes('link').href as string | undefined;
                  setInputValue(prev ?? '');
                  setSheet('link');
                }}
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <Link2 className="mx-auto mb-1 h-5 w-5" />
                Lien
              </button>
              <button
                type="button"
                onClick={() =>
                  insertBlock(() =>
                    editor.chain().focus().insertContent('<p>[shortcode]</p>').run()
                  )
                }
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <Braces className="mx-auto mb-1 h-5 w-5" />
                Code court
              </button>
            </div>
          </div>
        </div>
      )}

      {headingSheet === 'open' && (
        <ArticleHeadingPicker
          editor={editor}
          open
          onClose={closeHeadingSheet}
          bottomOffset={toolbarBottom > 0 ? toolbarBottom + 52 : undefined}
        />
      )}

      <div
        className="fixed inset-x-0 z-50 transition-[bottom] duration-150"
        style={{
          bottom: toolbarBottom > 0 ? toolbarBottom : 0,
          paddingBottom: toolbarBottom > 0 ? 0 : 'max(0px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="mx-auto max-w-lg">
          <ArticleEditorToolbar
            editor={editor}
            uploading={uploading}
            showDismissKeyboard={showDismissKeyboard}
            onDismissKeyboard={dismissKeyboard}
            onBlocksClick={() => {
              closeSheet();
              closeHeadingSheet();
              setBlockSheet((value) => (value === 'blocks' ? 'closed' : 'blocks'));
            }}
            onHeadingClick={openHeadingSheet}
            onImageClick={() => fileRef.current?.click()}
            onLinkClick={() => {
              closeBlockSheet();
              closeHeadingSheet();
              const prev = editor.getAttributes('link').href as string | undefined;
              setInputValue(prev ?? '');
              setSheet('link');
            }}
            onEmbedClick={() => {
              closeBlockSheet();
              closeHeadingSheet();
              setInputValue('');
              setSheet('embed');
            }}
          />
        </div>
      </div>
    </>
  );
}
