'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';

interface ArticleCommentFormProps {
  articleDocumentId: string;
}

export function ArticleCommentForm({ articleDocumentId }: ArticleCommentFormProps) {
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName, authorEmail, content, articleDocumentId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Envoi impossible');

      setStatus('success');
      setMessage('Commentaire envoyé — il sera visible après modération.');
      setContent('');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Erreur');
    }
  }

  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="font-display text-xl font-bold">Laisser un commentaire</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Votre commentaire sera publié après validation par la rédaction.
      </p>

      {status === 'success' ? (
        <p className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700">
          {message}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Votre nom"
              className="h-11 rounded-lg border border-border bg-card px-4 text-sm outline-none focus:border-primary"
            />
            <input
              required
              type="email"
              value={authorEmail}
              onChange={(e) => setAuthorEmail(e.target.value)}
              placeholder="Votre e-mail"
              className="h-11 rounded-lg border border-border bg-card px-4 text-sm outline-none focus:border-primary"
            />
          </div>
          <textarea
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Votre commentaire…"
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
          {status === 'error' && message && (
            <p className="text-sm text-red-600">{message}</p>
          )}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Envoyer
          </button>
        </form>
      )}
    </section>
  );
}
