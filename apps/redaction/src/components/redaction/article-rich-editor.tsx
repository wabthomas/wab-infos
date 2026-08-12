'use client';

import { fetchRedaction } from '@/lib/redaction/public-path';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Youtube from '@tiptap/extension-youtube';
import {
  BookOpen,
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
import { ArticleImage } from '@/lib/redaction/tiptap-article-image';
import { useEditorKeyboardInset } from '@/lib/redaction/use-editor-keyboard-inset';
import { ArticleEditorToolbar } from '@/components/redaction/article-editor-toolbar';
import { ArticleHeadingPicker } from '@/components/redaction/article-heading-picker';
import { ArticleEditorLinkSheet } from '@/components/redaction/article-editor-link-sheet';
import {
  ArticleEditorReadAlsoSheet,
  buildReadAlsoShortcode,
  type ReadAlsoInsertPayload,
} from '@/components/redaction/article-editor-read-also-sheet';
import { EditorBlockToolbar } from '@/components/redaction/editor-block-toolbar';

interface ArticleRichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onEditorReady?: (editor: Editor) => void;
  onKeyboardInsetChange?: (inset: number) => void;
}

type SheetMode = 'link' | 'embed' | 'image' | 'readalso' | null;
type BlockMode = 'closed' | 'blocks';
type HeadingMode = 'closed' | 'open';

/** Normalise une URL saisie (interne `/…`, externe, domaine nu). */
function normalizeEditorHref(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;

  if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) return url;
  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('./') || url.startsWith('../')) {
    return url;
  }
  // Domaine nu ou www. → https
  if (/^[\w.-]+\.[\w.-]+(\/.*)?$/i.test(url) || url.startsWith('www.')) {
    return `https://${url}`;
  }
  return null;
}

function linkDisplayText(href: string): string {
  if (href.startsWith('/')) return href;
  try {
    const parsed = new URL(href);
    return parsed.hostname.replace(/^www\./, '') + (parsed.pathname === '/' ? '' : parsed.pathname);
  } catch {
    return href;
  }
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}


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
  const [imageCaptionDraft, setImageCaptionDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [editorFocused, setEditorFocused] = useState(false);
  const { keyboardInset, visualOffsetTop } = useEditorKeyboardInset(true);
  const fileRef = useRef<HTMLInputElement>(null);
  /** Sélection capturée avant ouverture du panneau (sinon perdue au focus input / clavier mobile). */
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const lastTextSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const insertCursorRef = useRef<number | null>(null);
  const [linkSelectedText, setLinkSelectedText] = useState('');
  const lastEmitted = useRef(value);
  const onChangeRef = useRef(onChange);
  const syncTimerRef = useRef<number | null>(null);

  onChangeRef.current = onChange;

  const flushContentToParent = useCallback((html: string) => {
    if (syncTimerRef.current != null) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    lastEmitted.current = html;
    onChangeRef.current(html);
  }, []);

  const scheduleContentToParent = useCallback(
    (html: string) => {
      lastEmitted.current = html;
      if (syncTimerRef.current != null) window.clearTimeout(syncTimerRef.current);
      // Découple TipTap du formulaire React pendant la frappe.
      syncTimerRef.current = window.setTimeout(() => {
        syncTimerRef.current = null;
        onChangeRef.current(html);
      }, 280);
    },
    []
  );

  const editorPlaceholder = useCallback(
    ({ editor: ed }: { editor: Editor }) => {
      const { doc } = ed.state;
      const first = doc.firstChild;
      const isOnlyEmptyBlock =
        doc.childCount === 1 &&
        first &&
        first.content.size === 0 &&
        (first.type.name === 'paragraph' ||
          (first.type.name === 'heading' && first.attrs.level === 2));
      return isOnlyEmptyBlock ? placeholder : '';
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
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          class: 'article-editor-link',
        },
        isAllowedUri: (url, ctx) => {
          if (!url) return false;
          if (
            url.startsWith('/') ||
            url.startsWith('#') ||
            url.startsWith('./') ||
            url.startsWith('../')
          ) {
            return true;
          }
          return ctx.defaultValidate(url);
        },
      }),
      ArticleImage.configure({
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
      scheduleContentToParent(ed.getHTML());
    },
    onFocus: () => setEditorFocused(true),
    onBlur: ({ editor: ed }) => {
      setEditorFocused(false);
      flushContentToParent(ed.getHTML());
    },
  });

  useEffect(() => {
    return () => {
      if (syncTimerRef.current != null) {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
        onChangeRef.current(lastEmitted.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!editor) return;
    onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    onKeyboardInsetChange?.(keyboardInset);
  }, [keyboardInset, onKeyboardInsetChange]);

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

  useEffect(() => {
    if (!editor) return;
    const capture = () => {
      const { from, to } = editor.state.selection;
      savedSelectionRef.current = { from, to };
      insertCursorRef.current = from;
      if (from !== to) {
        lastTextSelectionRef.current = { from, to };
      }
    };
    editor.on('selectionUpdate', capture);
    editor.on('transaction', capture);
    return () => {
      editor.off('selectionUpdate', capture);
      editor.off('transaction', capture);
    };
  }, [editor]);

  const closeSheet = useCallback(() => {
    setSheet(null);
    setInputValue('');
    setImageCaptionDraft('');
    setLinkSelectedText('');
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

  const captureEditorSelection = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    savedSelectionRef.current = { from, to };
    insertCursorRef.current = from;
    if (from !== to) {
      lastTextSelectionRef.current = { from, to };
    }
  }, [editor]);

  const restoreLinkSelection = useCallback(() => {
    if (!editor) return null;
    const sel =
      savedSelectionRef.current &&
      savedSelectionRef.current.from !== savedSelectionRef.current.to
        ? savedSelectionRef.current
        : lastTextSelectionRef.current;
    editor.chain().focus(undefined, { scrollIntoView: false }).run();
    if (sel) {
      editor.commands.setTextSelection(sel);
      return sel;
    }
    return null;
  }, [editor]);

  const openLinkSheet = useCallback(() => {
    if (!editor) return;
    closeBlockSheet();
    closeHeadingSheet();
    captureEditorSelection();
    const sel =
      savedSelectionRef.current &&
      savedSelectionRef.current.from !== savedSelectionRef.current.to
        ? savedSelectionRef.current
        : lastTextSelectionRef.current;
    const selected =
      sel && sel.from !== sel.to
        ? editor.state.doc.textBetween(sel.from, sel.to, ' ')
        : '';
    setLinkSelectedText(selected.trim());
    const prev = editor.getAttributes('link').href as string | undefined;
    setInputValue(prev ?? '');
    setError('');
    setSheet('link');
  }, [captureEditorSelection, closeBlockSheet, closeHeadingSheet, editor]);

  const openReadAlsoSheet = useCallback(() => {
    if (!editor) return;
    closeBlockSheet();
    closeHeadingSheet();
    captureEditorSelection();
    setError('');
    setSheet('readalso');
  }, [captureEditorSelection, closeBlockSheet, closeHeadingSheet, editor]);

  const insertReadAlso = useCallback(
    (payload: ReadAlsoInsertPayload) => {
      if (!editor) return;
      const shortcode = buildReadAlsoShortcode(payload);
      const cursor = insertCursorRef.current;
      editor.chain().focus(undefined, { scrollIntoView: false }).run();
      if (typeof cursor === 'number') {
        editor.commands.setTextSelection(cursor);
      }
      const ok = editor
        .chain()
        .focus(undefined, { scrollIntoView: false })
        .insertContent(`<p>${shortcode}</p>`)
        .run();
      if (!ok) {
        setError('Impossible d’insérer l’encart « À lire aussi ».');
        return;
      }
      flushContentToParent(editor.getHTML());
      closeSheet();
    },
    [closeSheet, editor, flushContentToParent]
  );

  const applyLinkHref = useCallback(
    (rawHref: string, options?: { allowEmptyRemove?: boolean }) => {
      if (!editor) return false;
      const raw = rawHref.trim();
      restoreLinkSelection();

      if (!raw) {
        if (options?.allowEmptyRemove) {
          editor
            .chain()
            .focus(undefined, { scrollIntoView: false })
            .extendMarkRange('link')
            .unsetLink()
            .run();
          closeSheet();
          return true;
        }
        setError('Choisissez un article ou saisissez une URL.');
        return false;
      }

      const href = normalizeEditorHref(raw);
      if (!href) {
        setError('URL invalide. Ex. /politique/mon-article ou https://exemple.com');
        return false;
      }

      const external = isExternalHref(href);
      const linkAttrs = {
        href,
        target: external ? '_blank' : null,
        rel: external ? 'noopener noreferrer' : null,
      };

      const selectionEmpty = editor.state.selection.empty;
      let ok = false;

      if (selectionEmpty) {
        const text = linkSelectedText.trim() || linkDisplayText(href);
        ok = editor
          .chain()
          .focus(undefined, { scrollIntoView: false })
          .insertContent({
            type: 'text',
            text,
            marks: [{ type: 'link', attrs: linkAttrs }],
          })
          .run();
      } else {
        ok = editor
          .chain()
          .focus(undefined, { scrollIntoView: false })
          .extendMarkRange('link')
          .setLink(linkAttrs)
          .run();
      }

      if (!ok) {
        setError('Impossible d’appliquer le lien. Resélectionnez le texte puis réessayez.');
        return false;
      }

      flushContentToParent(editor.getHTML());
      closeSheet();
      return true;
    },
    [closeSheet, editor, flushContentToParent, linkSelectedText, restoreLinkSelection]
  );

  const applyLink = useCallback(() => {
    applyLinkHref(inputValue, { allowEmptyRemove: false });
  }, [applyLinkHref, inputValue]);

  const removeLink = useCallback(() => {
    applyLinkHref('', { allowEmptyRemove: true });
  }, [applyLinkHref]);

  const pickArticleLink = useCallback(
    (href: string) => {
      setInputValue(href);
      applyLinkHref(href);
    },
    [applyLinkHref]
  );

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

  const openImageMetaSheet = useCallback(() => {
    if (!editor) return;
    closeBlockSheet();
    closeHeadingSheet();
    if (!editor.isActive('image')) {
      setError('Sélectionnez d’abord une image dans l’article.');
      return;
    }
    const attrs = editor.getAttributes('image') as { alt?: string | null; title?: string | null };
    // Migration : anciens textes saisis dans « alt » → légende
    const caption = (attrs.title ?? '').trim() || (attrs.alt ?? '').trim();
    setImageCaptionDraft(caption);
    setError('');
    setSheet('image');
  }, [closeBlockSheet, closeHeadingSheet, editor]);

  const applyImageMeta = useCallback(() => {
    if (!editor) return;

    if (!editor.isActive('image')) {
      let imagePos: number | null = null;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'image') {
          imagePos = pos;
        }
        return undefined;
      });
      if (imagePos == null) {
        setError('Sélectionnez une image dans l’article pour modifier la légende.');
        return;
      }
      editor.commands.setNodeSelection(imagePos);
    }

    const caption = imageCaptionDraft.trim();
    const ok = editor
      .chain()
      .focus(undefined, { scrollIntoView: false })
      .updateAttributes('image', {
        // Jetpack : légende seule sur les images du corps (alt = image à la une)
        alt: null,
        title: caption || null,
      })
      .run();
    if (!ok) {
      setError('Impossible d’enregistrer la légende sur cette image.');
      return;
    }
    flushContentToParent(editor.getHTML());
    closeSheet();
  }, [closeSheet, editor, flushContentToParent, imageCaptionDraft]);

  const openImagePicker = useCallback(() => {
    captureEditorSelection();
    closeSheet();
    closeBlockSheet();
    closeHeadingSheet();
    fileRef.current?.click();
  }, [captureEditorSelection, closeBlockSheet, closeHeadingSheet, closeSheet]);

  const uploadImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      setUploading(true);
      setError('');
      try {
        const prepared = await compressClientImage(file);
        const form = new FormData();
        form.append('file', prepared);
        const res = await fetchRedaction('/api/redaction/upload', { method: 'POST', body: form });
        const data = await readApiJsonResponse<{
          media?: { url: string };
          duplicate?: boolean;
          error?: string;
        }>(res);
        if (!res.ok && !(res.status === 409 && data.duplicate && data.media)) {
          throw new Error(data.error ?? 'Upload échoué');
        }
        const mediaUrl = data.media!.url;
        const src = mediaUrl.startsWith('http')
          ? mediaUrl
          : mediaUrl.startsWith('/')
            ? mediaUrl
            : `/${mediaUrl}`;

        const cursor = insertCursorRef.current;
        editor.chain().focus(undefined, { scrollIntoView: false }).run();
        if (typeof cursor === 'number') {
          editor.commands.setTextSelection(cursor);
        }

        const ok = editor
          .chain()
          .focus(undefined, { scrollIntoView: false })
          .setImage({ src })
          .run();
        if (!ok) {
          throw new Error('Impossible d’insérer l’image dans l’article.');
        }

        // Sélectionner le nœud image pour pouvoir poser alt / légende ensuite
        let imagePos: number | null = null;
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'image' && node.attrs.src === src) {
            imagePos = pos;
            return false;
          }
          return undefined;
        });
        if (imagePos != null) {
          editor.commands.setNodeSelection(imagePos);
        }

        flushContentToParent(editor.getHTML());
        setImageCaptionDraft('');
        setError('');
        setSheet('image');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload échoué');
      } finally {
        setUploading(false);
      }
    },
    [editor, flushContentToParent]
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

      <ArticleEditorLinkSheet
        open={sheet === 'link'}
        url={inputValue}
        selectedText={linkSelectedText}
        bottomOffset={sheetBottom}
        error={error}
        onUrlChange={(next) => {
          setInputValue(next);
          setError('');
        }}
        onApply={applyLink}
        onRemove={removeLink}
        onClose={closeSheet}
        onPickHref={pickArticleLink}
      />

      <ArticleEditorReadAlsoSheet
        open={sheet === 'readalso'}
        bottomOffset={sheetBottom}
        onClose={closeSheet}
        onPick={insertReadAlso}
      />

      {sheet === 'image' || sheet === 'embed' ? (
        <div
          className="redaction-editor-fixed-panel z-[70] border-t border-border bg-background px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
          style={{
            bottom: sheetBottom,
            paddingBottom: toolbarBottom > 0 ? '0.75rem' : 'max(0.75rem, env(safe-area-inset-bottom))',
          }}
        >
          <div className="redaction-editor-width">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                {sheet === 'image'
                  ? 'Légende de l’image'
                  : 'Intégrer une vidéo ou un post'}
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

            {sheet === 'image' ? (
              <div className="space-y-3">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Optionnel — s’affiche sous l’image dans l’article publié. Le texte alternatif
                  se règle uniquement sur l’image à la une.
                </p>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Légende
                  </span>
                  <input
                    type="text"
                    autoFocus
                    value={imageCaptionDraft}
                    onChange={(e) => {
                      setImageCaptionDraft(e.target.value);
                      setError('');
                    }}
                    placeholder="Ex. Manifestation à Goma, mars 2026"
                    className="h-11 w-full rounded-xl border border-border bg-card px-3 text-base outline-none focus:border-primary"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyImageMeta();
                      }
                    }}
                  />
                </label>
                {error && <p className="text-xs text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeSheet}
                    className="h-10 flex-1 rounded-xl border border-border text-sm font-medium"
                  >
                    Plus tard
                  </button>
                  <button
                    type="button"
                    onClick={applyImageMeta}
                    className="h-10 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  autoFocus
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setError('');
                  }}
                  placeholder="Lien YouTube, X/Twitter ou Facebook"
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-base outline-none focus:border-primary"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyEmbed();
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
                    onClick={applyEmbed}
                    className="h-10 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
                  >
                    Intégrer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {blockSheet === 'blocks' && (
        <div
          className="redaction-editor-fixed-panel z-[65] border-t border-border bg-background px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
          style={{
            bottom:
              toolbarBottom > 0
                ? toolbarBottom + 52
                : 'calc(3.9rem + env(safe-area-inset-bottom))',
          }}
        >
          <div className="redaction-editor-width">
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
                onPointerDown={(e) => {
                  if (e.button === 0) e.preventDefault();
                }}
                onClick={() =>
                  insertBlock(() =>
                    editor.chain().focus(undefined, { scrollIntoView: false }).setParagraph().run()
                  )
                }
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <Pilcrow className="mx-auto mb-1 h-5 w-5" />
                Paragraphe
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  if (e.button === 0) e.preventDefault();
                }}
                onClick={() =>
                  insertBlock(() =>
                    editor
                      .chain()
                      .focus(undefined, { scrollIntoView: false })
                      .setHeading({ level: 2 })
                      .run()
                  )
                }
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <Heading2 className="mx-auto mb-1 h-5 w-5" />
                Titre 2
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  if (e.button === 0) e.preventDefault();
                }}
                onClick={() =>
                  insertBlock(() =>
                    editor
                      .chain()
                      .focus(undefined, { scrollIntoView: false })
                      .setHeading({ level: 3 })
                      .run()
                  )
                }
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <Heading3 className="mx-auto mb-1 h-5 w-5" />
                Titre 3
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  if (e.button === 0) e.preventDefault();
                }}
                onClick={() =>
                  insertBlock(() =>
                    editor
                      .chain()
                      .focus(undefined, { scrollIntoView: false })
                      .toggleBulletList()
                      .run()
                  )
                }
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <List className="mx-auto mb-1 h-5 w-5" />
                Liste
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  if (e.button === 0) e.preventDefault();
                }}
                onClick={() =>
                  insertBlock(() =>
                    editor
                      .chain()
                      .focus(undefined, { scrollIntoView: false })
                      .toggleOrderedList()
                      .run()
                  )
                }
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <ListOrdered className="mx-auto mb-1 h-5 w-5" />
                Liste num.
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  if (e.button === 0) e.preventDefault();
                }}
                onClick={() =>
                  insertBlock(() =>
                    editor
                      .chain()
                      .focus(undefined, { scrollIntoView: false })
                      .toggleBlockquote()
                      .run()
                  )
                }
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <Quote className="mx-auto mb-1 h-5 w-5" />
                Citation
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  if (e.button === 0) e.preventDefault();
                }}
                onClick={() => {
                  openImagePicker();
                }}
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <ImageIcon className="mx-auto mb-1 h-5 w-5" />
                Image
              </button>
              <button
                type="button"
                disabled={!editor.isActive('image')}
                onPointerDown={(e) => {
                  if (e.button === 0) e.preventDefault();
                }}
                onClick={() => {
                  closeBlockSheet();
                  openImageMetaSheet();
                }}
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted disabled:opacity-40"
              >
                <ImageIcon className="mx-auto mb-1 h-5 w-5" />
                Légende
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  if (e.button === 0) e.preventDefault();
                }}
                onClick={() =>
                  insertBlock(() =>
                    editor
                      .chain()
                      .focus(undefined, { scrollIntoView: false })
                      .setHorizontalRule()
                      .run()
                  )
                }
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <SeparatorHorizontal className="mx-auto mb-1 h-5 w-5" />
                Séparateur
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  if (e.button === 0) e.preventDefault();
                }}
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
                onPointerDown={(e) => {
                  if (e.button === 0) e.preventDefault();
                }}
                onClick={() => {
                  closeBlockSheet();
                  openLinkSheet();
                }}
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <Link2 className="mx-auto mb-1 h-5 w-5" />
                Lien
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  if (e.button === 0) e.preventDefault();
                }}
                onClick={() => {
                  openReadAlsoSheet();
                }}
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <BookOpen className="mx-auto mb-1 h-5 w-5" />
                À lire aussi
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  if (e.button === 0) e.preventDefault();
                }}
                onClick={() =>
                  insertBlock(() =>
                    editor
                      .chain()
                      .focus(undefined, { scrollIntoView: false })
                      .insertContent(
                        '<p>[dl url="" desc="" title="Télécharger MP3" type="audio"]</p>'
                      )
                      .run()
                  )
                }
                className="rounded-xl border border-border bg-card px-2 py-3 active:bg-muted"
              >
                <Braces className="mx-auto mb-1 h-5 w-5" />
                MP3 / DL
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
        className="redaction-editor-fixed-panel z-50"
        style={{
          // max() : filet CSS natif APK si le state React tarde d’un frame
          bottom: `max(${Math.max(toolbarBottom, 0)}px, var(--wab-ime-bottom, 0px))`,
          transform:
            visualOffsetTop > 0 && toolbarBottom <= 0
              ? `translate3d(0, ${visualOffsetTop}px, 0)`
              : undefined,
          paddingBottom:
            toolbarBottom > 0 ? 0 : 'max(0px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="redaction-editor-width">
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
            onImageClick={openImagePicker}
            onImagePointerDown={captureEditorSelection}
            onLinkClick={openLinkSheet}
            onLinkPointerDown={captureEditorSelection}
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
