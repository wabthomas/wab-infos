'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Loader2, Save, Sparkles, Wand2 } from 'lucide-react';
import type { AiProviderAdminView, AiSettingsAdminView } from '@/lib/ai/types';
import { readApiJsonResponse } from '@/lib/redaction/api-response';
import { useToast } from '@/components/ui/toast';

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';

type ProviderDraft = AiProviderAdminView & { apiKeyDraft: string; clearApiKey: boolean };

export function AiDeskPanel({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [settings, setSettings] = useState<AiSettingsAdminView | null>(null);
  const [providers, setProviders] = useState<ProviderDraft[]>([]);
  const [quotas, setQuotas] = useState<{
    reformulate: { used: number; limit: number };
    publish: { used: number; limit: number };
    research: { used: number; limit: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<'process' | 'test' | 'research' | null>(null);
  const [topic, setTopic] = useState('');
  const [researchUrl, setResearchUrl] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/redaction/ai/settings', { cache: 'no-store' });
      const data = await readApiJsonResponse<{
        settings?: AiSettingsAdminView;
        quotas?: typeof quotas;
        error?: string;
      }>(res);
      if (!res.ok || !data.settings) throw new Error(data.error || 'Chargement impossible');
      setSettings(data.settings);
      setQuotas(data.quotas ?? null);
      setProviders(
        data.settings.providers.map((provider) => ({
          ...provider,
          apiKeyDraft: '',
          clearApiKey: false,
        }))
      );
    } catch (error) {
      toast.error('Assistant IA', error instanceof Error ? error.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function patch(partial: Partial<AiSettingsAdminView>) {
    setSettings((current) => (current ? { ...current, ...partial } : current));
  }

  function patchProvider(name: string, partial: Partial<ProviderDraft>) {
    setProviders((rows) =>
      rows.map((row) => (row.name === name ? { ...row, ...partial } : row))
    );
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/redaction/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: settings.enabled,
          autoPublish: settings.autoPublish,
          providerChain: settings.providerChain,
          seoMinScore: settings.seoMinScore,
          maxSeoPasses: settings.maxSeoPasses,
          maxPerRun: settings.maxPerRun,
          dailyReformulateLimit: settings.dailyReformulateLimit,
          dailyPublishLimit: settings.dailyPublishLimit,
          dailyResearchLimit: settings.dailyResearchLimit,
          timeoutMs: settings.timeoutMs,
          providers: providers.map((provider) => ({
            name: provider.name,
            apiKey: provider.apiKeyDraft.trim() || undefined,
            clearApiKey: provider.clearApiKey,
            model: provider.model,
            baseUrl: provider.baseUrl,
            accountId: provider.accountId,
          })),
        }),
      });
      const data = await readApiJsonResponse<{ settings?: AiSettingsAdminView; error?: string }>(res);
      if (!res.ok || !data.settings) throw new Error(data.error || 'Enregistrement impossible');
      setSettings(data.settings);
      setProviders(
        data.settings.providers.map((provider) => ({
          ...provider,
          apiKeyDraft: '',
          clearApiKey: false,
        }))
      );
      toast.success('Configuration IA enregistrée');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  async function runProcess() {
    setBusy('process');
    try {
      const res = await fetch('/api/redaction/ai/process-imports', { method: 'POST' });
      const data = await readApiJsonResponse<{
        error?: string;
        skipped?: string;
        processed?: Array<{ title: string; published: boolean; seoScore: number }>;
        errors?: Array<{ error: string }>;
      }>(res);
      if (!res.ok) throw new Error(data.error || 'Traitement impossible');
      if (data.skipped) {
        toast.info(
          data.skipped === 'no_provider'
            ? 'Aucun fournisseur configuré — enregistrez une clé ci-dessous'
            : data.skipped === 'busy'
              ? 'Un traitement est déjà en cours'
              : 'Assistant IA désactivé'
        );
      } else {
        const published = data.processed?.filter((row) => row.published).length ?? 0;
        const held = (data.processed?.length ?? 0) - published;
        toast.success(
          `${published} publié(s), ${held} brouillon(s)`,
          data.errors?.length ? `${data.errors.length} erreur(s)` : undefined
        );
      }
      await load();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Traitement impossible');
    } finally {
      setBusy(null);
    }
  }

  async function runTest() {
    setBusy('test');
    try {
      const res = await fetch('/api/redaction/ai/test', { method: 'POST' });
      const data = await readApiJsonResponse<{
        ok?: boolean;
        error?: string;
        results?: Array<{ name: string; ok: boolean; detail: string }>;
      }>(res);
      if (!res.ok) throw new Error(data.error || 'Test impossible');
      const okNames = data.results?.filter((row) => row.ok).map((row) => row.name) ?? [];
      const detail = data.results
        ?.filter((row) => !row.ok)
        .map((row) => `${row.name}: ${row.detail}`)
        .join(' · ');
      if (data.ok) toast.success(`OK — ${okNames.join(', ')}`, detail);
      else toast.error('Aucun fournisseur n’a répondu', detail);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Test impossible');
    } finally {
      setBusy(null);
    }
  }

  async function runResearch() {
    if (!topic.trim() && !researchUrl.trim()) {
      toast.error('Indiquez un sujet ou un lien');
      return;
    }
    setBusy('research');
    try {
      const res = await fetch('/api/redaction/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim() || undefined,
          url: researchUrl.trim() || undefined,
          persist: true,
        }),
      });
      const data = await readApiJsonResponse<{
        documentId?: string;
        title?: string;
        featuredImage?: { id: number } | null;
        error?: string;
      }>(res);
      if (!res.ok || !data.documentId) throw new Error(data.error || 'Brouillon impossible');
      toast.success(
        'Brouillon proposé',
        data.featuredImage ? `${data.title} · photo à la une` : data.title
      );
      setTopic('');
      setResearchUrl('');
      router.push(`/articles/${data.documentId}/edit`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Brouillon impossible');
    } finally {
      setBusy(null);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement de l’assistant IA…
      </div>
    );
  }

  const sourceLabel =
    settings.source === 'cms'
      ? ' Configuration enregistrée dans le CMS.'
      : settings.source === 'env'
        ? ' Repli sur les variables d’environnement.'
        : settings.source === 'mixed'
          ? ' Mix CMS + .env.'
          : ' Aucune clé pour l’instant.';

  return (
    <section
      className={
        embedded
          ? 'space-y-5'
          : 'space-y-5 rounded-2xl border border-border bg-card p-4 shadow-sm lg:p-6'
      }
    >
      {embedded ? (
        <p className="text-sm text-muted-foreground">
          Clés et règles prioritaires sur le .env : reformulation des imports, SEO, signature
          « Rédaction Wab-infos » et publication si le seuil est atteint.{sourceLabel} Cet onglet a
          son propre bouton d’enregistrement.
        </p>
      ) : (
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold">Assistant IA rédaction</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Clés et règles gérées ici (prioritaires sur le .env). Reformule les imports, remplit le
              SEO, signe « Rédaction Wab-infos » et publie si le seuil est atteint.{sourceLabel}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => patch({ enabled: event.target.checked })}
          />
          Assistant activé
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={settings.autoPublish}
            onChange={(event) => patch({ autoPublish: event.target.checked })}
          />
          Auto-publish
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block space-y-1.5 sm:col-span-2 lg:col-span-3">
          <span className="text-xs font-semibold text-muted-foreground">
            Chaîne de fournisseurs (ordre de repli)
          </span>
          <input
            className={inputClass}
            value={settings.providerChain}
            placeholder="deepseek,groq,cerebras,gemini"
            onChange={(event) => patch({ providerChain: event.target.value })}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Seuil SEO</span>
          <input
            className={inputClass}
            inputMode="numeric"
            value={settings.seoMinScore}
            onChange={(event) => patch({ seoMinScore: Number(event.target.value) || 70 })}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Passes SEO max</span>
          <input
            className={inputClass}
            inputMode="numeric"
            value={settings.maxSeoPasses}
            onChange={(event) => patch({ maxSeoPasses: Number(event.target.value) || 2 })}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Par passage cron</span>
          <input
            className={inputClass}
            inputMode="numeric"
            value={settings.maxPerRun}
            onChange={(event) => patch({ maxPerRun: Number(event.target.value) || 2 })}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Quota reformuler / jour</span>
          <input
            className={inputClass}
            inputMode="numeric"
            value={settings.dailyReformulateLimit}
            onChange={(event) =>
              patch({ dailyReformulateLimit: Number(event.target.value) || 40 })
            }
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Quota publier / jour</span>
          <input
            className={inputClass}
            inputMode="numeric"
            value={settings.dailyPublishLimit}
            onChange={(event) => patch({ dailyPublishLimit: Number(event.target.value) || 20 })}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Quota recherche / jour</span>
          <input
            className={inputClass}
            inputMode="numeric"
            value={settings.dailyResearchLimit}
            onChange={(event) => patch({ dailyResearchLimit: Number(event.target.value) || 10 })}
          />
        </label>
      </div>

      {quotas ? (
        <p className="text-xs text-muted-foreground">
          Consommation du jour — reformuler {quotas.reformulate.used}/{quotas.reformulate.limit},
          publier {quotas.publish.used}/{quotas.publish.limit}, rechercher {quotas.research.used}/
          {quotas.research.limit}
          {settings.activeProviders.length
            ? ` · actifs : ${settings.activeProviders.join(', ')}`
            : ''}
        </p>
      ) : null}

      <div className="space-y-3">
        <h3 className="text-sm font-bold">Fournisseurs</h3>
        {providers.map((provider) => (
          <div
            key={provider.name}
            className="space-y-2 rounded-xl border border-border/80 bg-background/60 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">
                  {provider.label}{' '}
                  <span className="font-normal text-muted-foreground">({provider.name})</span>
                </p>
                <p className="text-xs text-muted-foreground">{provider.freeTier}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    provider.configured
                      ? 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {provider.configured ? 'prêt' : 'incomplet'}
                </span>
                {provider.apiKeyUrl ? (
                  <a
                    href={provider.apiKeyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                  >
                    Clé <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {!provider.keyless ? (
                <label className="block space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Clé API
                    {provider.apiKeySet ? ' (déjà enregistrée)' : ''}
                  </span>
                  <input
                    className={inputClass}
                    type="password"
                    autoComplete="new-password"
                    value={provider.apiKeyDraft}
                    placeholder={
                      provider.apiKeySet ? 'Laisser vide pour conserver' : 'Coller la clé'
                    }
                    onChange={(event) =>
                      patchProvider(provider.name, {
                        apiKeyDraft: event.target.value,
                        clearApiKey: false,
                      })
                    }
                  />
                </label>
              ) : (
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Sans clé — modèle local (Ollama).
                </p>
              )}
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">Modèle</span>
                <input
                  className={inputClass}
                  value={provider.model}
                  placeholder={provider.defaultModel}
                  onChange={(event) => patchProvider(provider.name, { model: event.target.value })}
                />
              </label>
              {provider.requiresAccountId ? (
                <label className="block space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">Account ID</span>
                  <input
                    className={inputClass}
                    value={provider.accountId}
                    onChange={(event) =>
                      patchProvider(provider.name, { accountId: event.target.value })
                    }
                  />
                </label>
              ) : null}
              {(provider.name === 'openai' || provider.name === 'ollama' || provider.baseUrl) && (
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">Base URL</span>
                  <input
                    className={inputClass}
                    value={provider.baseUrl}
                    placeholder={provider.defaultBaseUrl}
                    onChange={(event) =>
                      patchProvider(provider.name, { baseUrl: event.target.value })
                    }
                  />
                </label>
              )}
            </div>
            {provider.apiKeySet && !provider.keyless ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={provider.clearApiKey}
                  onChange={(event) =>
                    patchProvider(provider.name, {
                      clearApiKey: event.target.checked,
                      apiKeyDraft: event.target.checked ? '' : provider.apiKeyDraft,
                    })
                  }
                />
                Effacer la clé enregistrée
              </label>
            ) : null}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Enregistrer la configuration
      </button>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runProcess()}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {busy === 'process' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          Traiter la file d’imports
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runTest()}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {busy === 'test' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Tester les fournisseurs
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Proposer un article
        </label>
        <input
          value={researchUrl}
          onChange={(event) => setResearchUrl(event.target.value)}
          placeholder="Lien article ou X (https://…)"
          className={inputClass}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Sujet ou consignes (optionnel si lien)"
            className={inputClass}
          />
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void runResearch()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {busy === 'research' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Rédiger brouillon
          </button>
        </div>
      </div>
    </section>
  );
}
