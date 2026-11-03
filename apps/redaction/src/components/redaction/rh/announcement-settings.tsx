'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Megaphone, Save } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';

export function AnnouncementSettings() {
  const [form, setForm] = useState({ title: '', body: '', url: '', active: true });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRedaction('/api/redaction/rh/annonce/admin', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (data.message) {
          setForm({
            title: data.message.title ?? '',
            body: data.message.body ?? '',
            url: data.message.url ?? '',
            active: data.message.active !== false,
          });
        }
      })
      .catch(() => undefined);
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/annonce/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');
      setMessage('Message enregistré. Les collaborateurs le verront à leur prochaine ouverture.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Megaphone className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold">Message important aux collaborateurs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Affiché en pop-up à l’ouverture de l’espace RH, avec un bouton de confirmation.
          </p>
        </div>
      </div>
      <form onSubmit={save} className="mt-4 grid gap-3">
        <label className="text-sm font-medium">
          Titre
          <input
            required
            maxLength={160}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Message
          <textarea
            required
            rows={4}
            maxLength={2000}
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Lien (facultatif, ex. /mon-rh/retraits)
          <input
            maxLength={500}
            value={form.url}
            onChange={(event) => setForm({ ...form, url: event.target.value })}
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm({ ...form, active: event.target.checked })}
            className="h-4 w-4 accent-primary"
          />
          Message actif
        </label>
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
        {message && <p role="status" className="text-sm text-primary">{message}</p>}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {busy ? 'Enregistrement…' : 'Publier le message'}
        </button>
      </form>
    </section>
  );
}
