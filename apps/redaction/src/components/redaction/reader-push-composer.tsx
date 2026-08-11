'use client';

import { useState } from 'react';
import { Bell, Globe, Loader2, Send, Tv } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { readApiJsonResponse } from '@/lib/redaction/api-response';
import { useToast } from '@/components/ui/toast';
import type { ReaderDailyPushSettings, ReaderDailyPushTarget } from '@wab-infos/shared';

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

export function ReaderPushComposer({
  value,
  onChange,
}: {
  value: ReaderDailyPushSettings;
  onChange: (next: ReaderDailyPushSettings) => void;
}) {
  const toast = useToast();
  const [sending, setSending] = useState<'site' | 'youtube' | 'custom' | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  async function send(payload: {
    target?: 'site' | 'youtube';
    title?: string;
    body?: string;
  }) {
    const res = await fetchRedaction('/api/redaction/push/readers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await readApiJsonResponse<{
      ok?: boolean;
      sent?: number;
      failed?: number;
      error?: string;
    }>(res);
    if (!res.ok || data.ok === false) {
      throw new Error(data.error ?? 'Envoi impossible');
    }
    toast.success(
      'Push lecteurs envoyé',
      `${data.sent ?? 0} appareil(s) · ${data.failed ?? 0} échec(s)`
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            Push lecteurs
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Invitez les lecteurs (APK / PWA) à revenir sur le site ou la chaîne YouTube.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={Boolean(sending)}
          onClick={() => {
            setSending('site');
            void send({ target: 'site' }).finally(() => setSending(null));
          }}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold disabled:opacity-60"
        >
          {sending === 'site' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
          Visiter le site
        </button>
        <button
          type="button"
          disabled={Boolean(sending)}
          onClick={() => {
            setSending('youtube');
            void send({ target: 'youtube' }).finally(() => setSending(null));
          }}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold disabled:opacity-60"
        >
          {sending === 'youtube' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Tv className="h-4 w-4" />
          )}
          Chaîne YouTube
        </button>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">Message personnalisé</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          placeholder="Titre de la notification"
        />
      </label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={240}
        rows={2}
        className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        placeholder="Texte (optionnel)"
      />
      <button
        type="button"
        disabled={Boolean(sending) || !title.trim()}
        onClick={() => {
          setSending('custom');
          void send({ target: 'site', title: title.trim(), body: body.trim() })
            .then(() => {
              setTitle('');
              setBody('');
            })
            .finally(() => setSending(null));
        }}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {sending === 'custom' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Envoyer maintenant
      </button>

      <div className="space-y-3 border-t border-border pt-4">
        <label className="flex cursor-pointer items-start justify-between gap-3">
          <span>
            <span className="block text-sm font-semibold">Envoi automatique chaque jour</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              À l’heure choisie (Kinshasa). Enregistrez les paramètres pour activer.
            </span>
          </span>
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
            className="mt-1 h-5 w-5 accent-primary"
          />
        </label>
        {value.enabled ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Heure</span>
              <select
                value={value.hour}
                onChange={(e) => onChange({ ...value, hour: Number(e.target.value) })}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, '0')} h
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Destination</span>
              <select
                value={value.target}
                onChange={(e) =>
                  onChange({ ...value, target: e.target.value as ReaderDailyPushTarget })
                }
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="alternate">Alterner site / YouTube</option>
                <option value="site">Toujours le site</option>
                <option value="youtube">Toujours YouTube</option>
              </select>
            </label>
          </div>
        ) : null}
      </div>
    </section>
  );
}
