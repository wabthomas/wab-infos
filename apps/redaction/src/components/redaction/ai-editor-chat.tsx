'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ImagePlus,
  Loader2,
  SendHorizontal,
  X,
} from 'lucide-react';
import { normalizeArticleSeoMeta } from '@wab-infos/shared';
import { readApiJsonResponse } from '@/lib/redaction/api-response';
import { fetchRedaction } from '@/lib/redaction/public-path';
import type { RedactionMediaItem } from '@/lib/redaction/types';
import { useEditorKeyboardInset } from '@/lib/redaction/use-editor-keyboard-inset';
import { cn, getStrapiMediaUrl } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

export type AiChatAction =
  | { type: 'set_title'; value: string }
  | { type: 'set_excerpt'; value: string }
  | { type: 'set_content'; value: string }
  | {
      type: 'set_seo';
      seoTitle?: string;
      seoDescription?: string;
      focusKeyphrase?: string;
    }
  | {
      type: 'set_featured_image';
      mediaId: number;
      url?: string;
      alternativeText?: string;
    }
  | { type: 'set_category_slug'; value: string }
  | { type: 'set_canonical_url'; value: string };

export interface AiChatArticleSnapshot {
  title?: string;
  excerpt?: string;
  contentHtml?: string;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyphrase?: string;
  categorySlug?: string;
  canonicalUrl?: string;
  featuredImageId?: number | null;
  featuredImageUrl?: string | null;
}

interface ChatAttachment {
  mediaId: number;
  url: string;
  alternativeText?: string | null;
  name?: string;
  previewUrl: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
  applied?: string[];
  researchedUrls?: string[];
}

interface AiEditorChatProps {
  open: boolean;
  onClose: () => void;
  article: AiChatArticleSnapshot;
  onActions: (actions: AiChatAction[]) => void;
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function summarizeActions(actions: AiChatAction[]): string[] {
  return actions.map((action) => {
    switch (action.type) {
      case 'set_title':
        return 'Titre';
      case 'set_excerpt':
        return 'Chapô';
      case 'set_content':
        return 'Contenu';
      case 'set_seo':
        return 'SEO';
      case 'set_featured_image':
        return 'Photo à la une';
      case 'set_category_slug':
        return 'Rubrique';
      case 'set_canonical_url':
        return 'URL canonique';
      default:
        return 'Mise à jour';
    }
  });
}

export function AiEditorChat({ open, onClose, article, onActions }: AiEditorChatProps) {
  const toast = useToast();
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { keyboardInset } = useEditorKeyboardInset(open);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pendingFiles, setPendingFiles] = useState<ChatAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, busy, keyboardInset]);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (!list.length) {
      toast.error('Image uniquement');
      return;
    }
    setUploading(true);
    try {
      const uploaded: ChatAttachment[] = [];
      for (const file of list.slice(0, 3)) {
        const form = new FormData();
        form.append('file', file);
        const res = await fetchRedaction('/api/redaction/upload', {
          method: 'POST',
          body: form,
        });
        const data = await readApiJsonResponse<{
          media?: RedactionMediaItem;
          error?: string;
          duplicate?: boolean;
        }>(res);
        const media = data.media;
        if ((!res.ok && !data.duplicate) || !media?.id) {
          throw new Error(data.error || 'Upload impossible');
        }
        const url = media.url;
        uploaded.push({
          mediaId: media.id,
          url,
          alternativeText: media.alternativeText,
          name: media.name || file.name,
          previewUrl: getStrapiMediaUrl(url) || url,
        });
      }
      setPendingFiles((current) => [...current, ...uploaded].slice(0, 4));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload impossible');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function send() {
    const text = input.trim();
    if ((!text && !pendingFiles.length) || busy) return;

    const userMessage: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text || 'Voici une photo.',
      attachments: pendingFiles,
    };
    const nextHistory = [...messages, userMessage]
      .slice(-12)
      .map((row) => ({ role: row.role, content: row.content }));

    setMessages((current) => [...current, userMessage]);
    setInput('');
    const attachments = pendingFiles;
    setPendingFiles([]);
    setBusy(true);

    try {
      const res = await fetch('/api/redaction/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: nextHistory.slice(0, -1),
          article,
          attachments: attachments.map((item) => ({
            mediaId: item.mediaId,
            url: item.url,
            alternativeText: item.alternativeText,
            name: item.name,
          })),
        }),
      });
      const data = await readApiJsonResponse<{
        reply?: string;
        actions?: AiChatAction[];
        researchedUrls?: string[];
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || 'Chat IA impossible');

      const actions = Array.isArray(data.actions) ? data.actions : [];
      if (actions.length) onActions(actions);

      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: 'assistant',
          content: data.reply?.trim() || 'C’est appliqué.',
          applied: summarizeActions(actions),
          researchedUrls: Array.isArray(data.researchedUrls) ? data.researchedUrls : [],
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chat IA impossible';
      toast.error(message);
      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: 'assistant',
          content: `Je n’ai pas pu répondre : ${message}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <aside
      className={cn(
        'fixed inset-x-0 z-[70] flex flex-col border-t border-border bg-card shadow-2xl',
        'bottom-[var(--ai-chat-kb,0px)] max-h-[min(78vh,calc(100dvh-var(--ai-chat-kb,0px)-0.5rem))]',
        'lg:inset-y-0 lg:right-0 lg:bottom-auto lg:left-auto lg:top-0 lg:h-full lg:max-h-none lg:w-[min(100%,400px)] lg:border-l lg:border-t-0'
      )}
      style={
        {
          '--ai-chat-kb': `${Math.max(0, keyboardInset)}px`,
        } as CSSProperties
      }
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-primary-foreground"
          style={{
            background:
              'linear-gradient(145deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 70%, #1a1a2e) 100%)',
          }}
          aria-hidden
        >
          W
        </span>
        <p className="min-w-0 flex-1 text-[15px] font-semibold tracking-tight text-foreground">
          Wab Ai
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 [-webkit-overflow-scrolling:touch]"
      >
        {messages.length === 0 && !busy ? (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 px-4 text-center">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-primary-foreground"
              style={{
                background:
                  'linear-gradient(145deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 70%, #1a1a2e) 100%)',
              }}
              aria-hidden
            >
              W
            </span>
            <p className="text-base font-semibold text-foreground">Wab Ai</p>
          </div>
        ) : null}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex w-full',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[85%] text-[15px] leading-relaxed',
                message.role === 'user'
                  ? 'rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-primary-foreground'
                  : 'rounded-2xl rounded-bl-md bg-muted/80 px-3.5 py-2.5 text-foreground'
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.attachments?.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {message.attachments.map((item) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={item.mediaId}
                      src={item.previewUrl}
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover ring-1 ring-black/10"
                    />
                  ))}
                </div>
              ) : null}
              {message.researchedUrls?.length ? (
                <p className="mt-1.5 break-all text-[11px] opacity-75">
                  {message.researchedUrls.join(' · ')}
                </p>
              ) : null}
              {message.applied?.length ? (
                <p className="mt-1.5 text-[11px] opacity-75">
                  {message.applied.join(' · ')}
                </p>
              ) : null}
            </div>
          </div>
        ))}
        {busy ? (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-muted/80 px-3.5 py-2.5 text-muted-foreground">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/70" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/70 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/70 [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {pendingFiles.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto px-4 pb-1">
          {pendingFiles.map((item) => (
            <div key={item.mediaId} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt=""
                className="h-14 w-14 rounded-xl object-cover ring-1 ring-border"
              />
              <button
                type="button"
                onClick={() =>
                  setPendingFiles((current) =>
                    current.filter((row) => row.mediaId !== item.mediaId)
                  )
                }
                className="absolute -right-1 -top-1 rounded-full bg-foreground/80 p-0.5 text-background"
                aria-label="Retirer la photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div
        className="px-3 pb-3 pt-1.5 lg:pb-3"
        style={{
          paddingBottom:
            keyboardInset > 0
              ? '0.75rem'
              : 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-end gap-1 rounded-[1.75rem] border border-border bg-muted/40 px-1.5 py-1.5 shadow-sm focus-within:border-primary/40 focus-within:bg-card">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.length) void uploadFiles(event.target.files);
            }}
          />
          <button
            type="button"
            disabled={busy || uploading}
            onClick={() => fileRef.current?.click()}
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Joindre une photo"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onFocus={() => {
              window.requestAnimationFrame(() => {
                inputRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                listRef.current && (listRef.current.scrollTop = listRef.current.scrollHeight);
              });
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder="Demander à Wab Ai"
            disabled={busy}
            className="max-h-28 min-h-[2.25rem] flex-1 resize-none bg-transparent px-1 py-2 text-[15px] outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
          />
          <button
            type="button"
            disabled={busy || uploading || (!input.trim() && !pendingFiles.length)}
            onClick={() => void send()}
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-35"
            aria-label="Envoyer"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

export function applyAiChatSeoMeta(action: Extract<AiChatAction, { type: 'set_seo' }>) {
  return normalizeArticleSeoMeta({
    focusKeyphrase: action.focusKeyphrase || '',
    robotsIndex: true,
    robotsFollow: true,
    schemaType: 'NewsArticle',
    ogTitle: action.seoTitle,
    ogDescription: action.seoDescription,
  });
}
