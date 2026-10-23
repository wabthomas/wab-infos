'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Mail, Send, Upload, UserMinus } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { readApiJsonResponse } from '@/lib/redaction/api-response';
import { useToast } from '@/components/ui/toast';
import type { NewsletterSettingsView, NewsletterSubscriberRow } from '@/lib/redaction/newsletter-types';

const inputClass =
  'h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary';

export function NewsletterDesk() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [unsubscribingId, setUnsubscribingId] = useState<string | null>(null);
  const [settings, setSettings] = useState<NewsletterSettingsView | null>(null);
  const [password, setPassword] = useState('');
  const [testTo, setTestTo] = useState('');
  const [singleEmail, setSingleEmail] = useState('');
  const [importText, setImportText] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<NewsletterSubscriberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const loadList = useCallback(async (nextPage: number, nextQuery: string) => {
    const params = new URLSearchParams({ page: String(nextPage), q: nextQuery });
    const response = await fetchRedaction(`/api/redaction/newsletter/subscribers?${params}`, {
      cache: 'no-store',
    });
    const data = await readApiJsonResponse<{
      rows: NewsletterSubscriberRow[];
      total: number;
      active: number;
      pageCount: number;
      error?: string;
    }>(response);
    if (!response.ok) throw new Error(data.error || 'Liste impossible');
    setRows(data.rows ?? []);
    setTotal(data.total ?? 0);
    setActive(data.active ?? 0);
    setPageCount(data.pageCount ?? 1);
    setPage(nextPage);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetchRedaction('/api/redaction/newsletter', { cache: 'no-store' });
        const data = await readApiJsonResponse<{ settings?: NewsletterSettingsView; error?: string }>(
          response
        );
        if (!response.ok || !data.settings) throw new Error(data.error || 'Configuration illisible');
        setSettings(data.settings);
        await loadList(1, '');
      } catch (error) {
        toast.error('Newsletter', error instanceof Error ? error.message : 'Chargement impossible');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadList, toast]);

  function patch(partial: Partial<NewsletterSettingsView>) {
    setSettings((current) => (current ? { ...current, ...partial } : current));
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const response = await fetchRedaction('/api/redaction/newsletter', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, smtpPass: password }),
      });
      const data = await readApiJsonResponse<{ settings?: NewsletterSettingsView; error?: string }>(
        response
      );
      if (!response.ok || !data.settings) throw new Error(data.error || 'Enregistrement impossible');
      setSettings(data.settings);
      setPassword('');
      toast.success('Configuration enregistrée', 'Les prochains envois utiliseront ces paramètres.');
    } catch (error) {
      toast.error('Enregistrement', error instanceof Error ? error.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    try {
      const response = await fetchRedaction('/api/redaction/newsletter/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo }),
      });
      const data = await readApiJsonResponse<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !data.ok) throw new Error(data.error || 'Test impossible');
      toast.success('E-mail de test envoyé', `Vérifiez la boîte ${testTo.trim()}.`);
    } catch (error) {
      toast.error('Test', error instanceof Error ? error.message : 'Erreur');
    } finally {
      setTesting(false);
    }
  }

  async function unsubscribeRow(row: NewsletterSubscriberRow) {
    if (row.status !== 'active') return;
    const ok = window.confirm(
      `Désinscrire ${row.email} ?\n\nUn e-mail de confirmation lui sera envoyé.`
    );
    if (!ok) return;

    setUnsubscribingId(row.documentId);
    try {
      const response = await fetchRedaction('/api/redaction/newsletter/subscribers/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: row.documentId, notify: true }),
      });
      const data = await readApiJsonResponse<{
        email?: string;
        notified?: boolean;
        alreadyUnsubscribed?: boolean;
        notifyError?: string;
        error?: string;
      }>(response);
      if (!response.ok) throw new Error(data.error || 'Désinscription impossible');

      if (data.alreadyUnsubscribed) {
        toast.success('Déjà désinscrit', data.email || row.email);
      } else if (data.notified) {
        toast.success('Désinscrit', `${data.email || row.email} — confirmation envoyée.`);
      } else if (data.notifyError) {
        toast.error(
          'Désinscrit sans e-mail',
          `L’adresse est désinscrite, mais l’envoi a échoué : ${data.notifyError}`
        );
      } else {
        toast.success('Désinscrit', data.email || row.email);
      }
      await loadList(page, query);
    } catch (error) {
      toast.error('Désinscription', error instanceof Error ? error.message : 'Erreur');
    } finally {
      setUnsubscribingId(null);
    }
  }

  async function submitEmails(raw: string) {
    setImporting(true);
    try {
      const response = await fetchRedaction('/api/redaction/newsletter/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: raw }),
      });
      const data = await readApiJsonResponse<{
        created?: number;
        reactivated?: number;
        skipped?: number;
        invalid?: number;
        noMx?: number;
        deactivated?: number;
        error?: string;
      }>(response);
      if (!response.ok) throw new Error(data.error || 'Import impossible');
      const parts = [
        `${data.created ?? 0} ajoutée(s)`,
        `${data.reactivated ?? 0} réactivée(s)`,
        `${data.skipped ?? 0} déjà présente(s)`,
        `${data.invalid ?? 0} format invalide`,
        `${data.noMx ?? 0} domaine sans mail`,
      ];
      if ((data.deactivated ?? 0) > 0) {
        parts.push(`${data.deactivated} désactivée(s) (MX)`);
      }
      toast.success('Liste mise à jour', `${parts.join(', ')}.`);
      setSingleEmail('');
      setImportText('');
      await loadList(1, query);
    } catch (error) {
      toast.error('Import', error instanceof Error ? error.message : 'Erreur');
    } finally {
      setImporting(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement de la newsletter…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">Configuration d’envoi</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mot de passe de la boîte newsletter@wab-infos.com. Il est enregistré pour les envois
              d’actualités et de vidéos.
              {settings.smtpPassSet
                ? ' Un mot de passe est déjà en place.'
                : ' Aucun mot de passe n’est enregistré.'}
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => patch({ enabled: event.target.checked })}
          />
          Envois activés
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Serveur SMTP</span>
            <input className={inputClass} value={settings.smtpHost} onChange={(event) => patch({ smtpHost: event.target.value })} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Port</span>
            <input
              className={inputClass}
              inputMode="numeric"
              value={settings.smtpPort}
              onChange={(event) => patch({ smtpPort: Number(event.target.value) || 465 })}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Utilisateur</span>
            <input className={inputClass} value={settings.smtpUser} onChange={(event) => patch({ smtpUser: event.target.value })} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Mot de passe</span>
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              value={password}
              placeholder={settings.smtpPassSet ? 'Laisser vide pour le conserver' : 'Mot de passe de la boîte'}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Expéditeur</span>
            <input className={inputClass} value={settings.senderEmail} onChange={(event) => patch({ senderEmail: event.target.value })} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Nom affiché</span>
            <input className={inputClass} value={settings.senderName} onChange={(event) => patch({ senderName: event.target.value })} />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold text-muted-foreground">Répondre à</span>
            <input className={inputClass} value={settings.replyTo} onChange={(event) => patch({ replyTo: event.target.value })} />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.smtpSecure}
            onChange={(event) => patch({ smtpSecure: event.target.checked })}
          />
          Connexion sécurisée (port 465)
        </label>

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Enregistrer
        </button>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold">E-mail de test</h2>
        <p className="text-sm text-muted-foreground">
          Enregistrez d’abord le mot de passe. Le message part vers une seule adresse, pas vers toute la liste.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className={inputClass}
            type="email"
            value={testTo}
            placeholder="votre@adresse.com"
            onChange={(event) => setTestTo(event.target.value)}
          />
          <button
            type="button"
            onClick={() => void sendTest()}
            disabled={testing || !testTo.trim()}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-bold disabled:opacity-60"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Envoyer le test
          </button>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Abonnés</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {active} actif(s) · {total} au total
            </p>
          </div>
        </div>

        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void submitEmails(singleEmail);
          }}
        >
          <input
            className={inputClass}
            type="email"
            value={singleEmail}
            placeholder="Ajouter une adresse"
            onChange={(event) => setSingleEmail(event.target.value)}
          />
          <button
            type="submit"
            disabled={importing || !singleEmail.trim()}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            Ajouter
          </button>
        </form>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">
            Importer une liste (une adresse par ligne, ou séparées par des virgules)
          </span>
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={6}
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            placeholder={'marie@exemple.com\njean@exemple.com'}
          />
        </label>
        <button
          type="button"
          onClick={() => void submitEmails(importText)}
          disabled={importing || !importText.trim()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-bold disabled:opacity-60"
        >
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Importer
        </button>

        <form
          className="flex gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void loadList(1, query).catch((error: unknown) => {
              toast.error('Recherche', error instanceof Error ? error.message : 'Erreur');
            });
          }}
        >
          <input
            className={inputClass}
            value={query}
            placeholder="Rechercher une adresse"
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" className="inline-flex h-11 shrink-0 items-center rounded-xl border border-border px-4 text-sm font-bold">
            Chercher
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">Adresse</th>
                <th className="py-2 pr-3 font-semibold">État</th>
                <th className="py-2 pr-3 font-semibold">Origine</th>
                <th className="py-2 pr-3 font-semibold">Inscription</th>
                <th className="py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-muted-foreground">
                    Aucune adresse pour le moment.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.documentId} className="border-b border-border/70">
                    <td className="py-2.5 pr-3 font-medium">{row.email}</td>
                    <td className="py-2.5 pr-3">
                      {row.status === 'active' ? 'Actif' : 'Désinscrit'}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{row.source}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {row.subscribedAt
                        ? format(new Date(row.subscribedAt), 'd MMM yyyy', { locale: fr })
                        : '—'}
                    </td>
                    <td className="py-2.5">
                      {row.status === 'active' ? (
                        <button
                          type="button"
                          disabled={unsubscribingId === row.documentId}
                          onClick={() => void unsubscribeRow(row)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold hover:bg-muted disabled:opacity-60"
                          title="Désinscrire et notifier"
                        >
                          {unsubscribingId === row.documentId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserMinus className="h-3.5 w-3.5" />
                          )}
                          Désinscrire
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pageCount > 1 ? (
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              disabled={page <= 1}
              className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-50"
              onClick={() => void loadList(page - 1, query)}
            >
              Précédent
            </button>
            <span className="text-muted-foreground">
              {page} / {pageCount}
            </span>
            <button
              type="button"
              disabled={page >= pageCount}
              className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-50"
              onClick={() => void loadList(page + 1, query)}
            >
              Suivant
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
