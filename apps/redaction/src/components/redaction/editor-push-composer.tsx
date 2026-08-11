'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2, Send } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { readApiJsonResponse } from '@/lib/redaction/api-response';
import { useToast } from '@/components/ui/toast';
import type { RedactionAuthor } from '@/lib/redaction/types';

export function EditorPushComposer() {
  const toast = useToast();
  const [authors, setAuthors] = useState<RedactionAuthor[]>([]);
  const [recipients, setRecipients] = useState<Array<{ email: string; deviceCount: number }>>([]);
  const [target, setTarget] = useState<'all' | string>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetchRedaction('/api/redaction/authors', { cache: 'no-store' })
        .then((res) => readApiJsonResponse<{ authors?: RedactionAuthor[] }>(res))
        .then((data) => setAuthors(data.authors ?? []))
        .catch(() => undefined),
      fetchRedaction('/api/redaction/push/send', { cache: 'no-store' })
        .then((res) =>
          readApiJsonResponse<{ recipients?: Array<{ email: string; deviceCount: number }> }>(res)
        )
        .then((data) => setRecipients(data.recipients ?? []))
        .catch(() => undefined),
    ]);
  }, []);

  async function send() {
    if (!title.trim()) {
      toast.error('Titre requis', 'Saisissez le titre de la notification.');
      return;
    }
    setSending(true);
    try {
      const res = await fetchRedaction('/api/redaction/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          url: '/',
          all: target === 'all',
          email: target === 'all' ? undefined : target,
        }),
      });
      const data = await readApiJsonResponse<{
        ok?: boolean;
        sent?: number;
        failed?: number;
        error?: string;
      }>(res);
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'Envoi impossible');
      }
      toast.success(
        'Notification envoyée',
        `${data.sent ?? 0} appareil(s) · ${data.failed ?? 0} échec(s)`
      );
      setTitle('');
      setBody('');
    } catch (err) {
      toast.error('Envoi impossible', err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            Push rédacteurs
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Envoi manuel d’une notification aux rédacteurs abonnés (APK ou navigateur).
          </p>
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">Destinataire</span>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="all">Tous les rédacteurs abonnés ({recipients.length})</option>
          {authors
            .filter((a) => a.email)
            .map((author) => {
              const devices = recipients.find(
                (row) => row.email.toLowerCase() === author.email!.toLowerCase()
              )?.deviceCount;
              return (
                <option key={author.documentId} value={author.email}>
                  {author.name} ({author.email}
                  {devices ? ` · ${devices} app.` : ' · non abonné'})
                </option>
              );
            })}
          {recipients
            .filter(
              (row) =>
                !authors.some((a) => a.email?.toLowerCase() === row.email.toLowerCase())
            )
            .map((row) => (
              <option key={row.email} value={row.email}>
                {row.email} ({row.deviceCount} app.)
              </option>
            ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">Titre</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          placeholder="Message de la rédaction"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">Texte</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={240}
          rows={3}
          className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          placeholder="Félicitations, continuez ainsi…"
        />
      </label>

      <button
        type="button"
        disabled={sending || !title.trim()}
        onClick={() => void send()}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {sending ? 'Envoi…' : 'Envoyer la notification'}
      </button>
    </section>
  );
}
