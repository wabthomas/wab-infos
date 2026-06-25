'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Youtube from '@tiptap/extension-youtube';
import { Loader2, X } from 'lucide-react';
import { parseEmbedUrl } from '@/lib/redaction/embed-urls';
import { SocialEmbed } from '@/lib/redaction/tiptap-social-embed';
import { ArticleEditorToolbar } from '@/components/redaction/article-editor-toolbar';

interface ArticleRichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

type SheetMode = 'link' | 'embed' | null;

export function ArticleRichEditor({
  value,
  onChange,
  placeholder = 'Commencez à écrire…',
}: ArticleRichEditorProps) {
  const [sheet, setSheet] = useState<SheetMode>(null);
  const [inputValue, setInputValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef(value);

  const editor = useEditor({
    immediatelyRender: false,
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
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'redaction-editor-prose jetpack-editor-body outline-none',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

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
    if (parsed.platform === 'youtube' && parsed.youtubeId) {
      editor.commands.setYoutubeVideo({ src: parsed.youtubeId });
    } else {
      editor.commands.setSocialEmbed({
        platform: parsed.platform,
        url: parsed.url,
        embedUrl: parsed.embedUrl,
      });
    }
    closeSheet();
  }, [closeSheet, editor, inputValue]);

  const uploadImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      setUploading(true);
      setError('');
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/redaction/upload', { method: 'POST', body: form });
        const data = (await res.json()) as { media?: { url: string }; error?: string };
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

  return (
    <>
      <EditorContent editor={editor} />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadImage(file);
          e.target.value = '';
        }}
      />

      {sheet && (
        <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-border bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
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

      <div className="fixed inset-x-0 bottom-0 z-50 pb-[max(0px,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg">
          <ArticleEditorToolbar
            editor={editor}
            uploading={uploading}
            onImageClick={() => fileRef.current?.click()}
            onLinkClick={() => {
              const prev = editor.getAttributes('link').href as string | undefined;
              setInputValue(prev ?? '');
              setSheet('link');
            }}
            onEmbedClick={() => {
              setInputValue('');
              setSheet('embed');
            }}
          />
        </div>
      </div>
    </>
  );
}
