'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Newspaper,
  RefreshCw,
  Sparkles,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import type {
  SeoBrief,
  SeoCompetitionSnapshot,
  SeoCompetitorSource,
  SeoIndexingHealth,
} from '@wab-infos/shared';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { readApiJsonResponse } from '@/lib/redaction/api-response';

function relativeTime(iso?: string): string {
  if (!iso) return '';
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return '';
  const minutes = Math.round((Date.now() - time) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

function briefToText(brief: SeoBrief): string {
  return [
    `TITRE : ${brief.title}`,
    `ANGLE : ${brief.angle}`,
    `TITRE SEO : ${brief.seoTitle}`,
    `META : ${brief.seoDescription}`,
    `REQUÊTE CIBLE : ${brief.focusKeyphrase}`,
    brief.secondaryKeywords.length
      ? `REQUÊTES SECONDAIRES : ${brief.secondaryKeywords.join(', ')}`
      : '',
    `PLAN :\n${brief.outline.map((row) => `- ${row}`).join('\n')}`,
    brief.mustHaveFacts.length
      ? `À VÉRIFIER :\n${brief.mustHaveFacts.map((row) => `- ${row}`).join('\n')}`
      : '',
    brief.sources.length ? `SOURCES :\n${brief.sources.map((row) => `- ${row}`).join('\n')}` : '',
    `URGENCE : ${brief.urgency}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function HealthBadge({
  ok,
  label,
  hint,
}: {
  ok: boolean;
  label: string;
  hint: string;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2"
      title={hint}
    >
      {ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      )}
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

function CompetitorRow({ source }: { source: SeoCompetitorSource }) {
  return (
    <li className="rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <a
          href={source.homeUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold hover:text-primary"
        >
          <span className="truncate">{source.name}</span>
          <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
        </a>
        <div className="flex shrink-0 items-baseline gap-1.5">
          <span className="text-lg font-bold tabular-nums">{source.recent}</span>
          <span className="text-[11px] text-muted-foreground">titres/24 h</span>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {source.reachable ? (
          <>
            {source.lastPublishedAt ? (
              <span className="text-[11px] text-muted-foreground">
                dernier {relativeTime(source.lastPublishedAt)}
              </span>
            ) : null}
            {source.topKeywords.slice(0, 4).map((keyword) => (
              <span
                key={keyword.term}
                className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {keyword.term}
              </span>
            ))}
          </>
        ) : (
          <span className="text-[11px] text-amber-600 dark:text-amber-400">
            Flux indisponible — {source.error ?? 'erreur inconnue'}
          </span>
        )}
      </div>
    </li>
  );
}

function IndexingPanel({ health }: { health: SeoIndexingHealth }) {
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <HealthBadge
          ok={health.indexNowConfigured}
          label="IndexNow"
          hint="INDEXNOW_KEY doit être défini côté site (Bing, Yandex, Naver…)."
        />
        <HealthBadge
          ok={health.googleIndexingConfigured}
          label="Google Indexing"
          hint="Compte de service propriétaire Search Console (GOOGLE_INDEXING_*)."
        />
        <HealthBadge
          ok={health.cloudflarePurgeConfigured}
          label="Purge CDN"
          hint="CLOUDFLARE_ZONE_ID + CLOUDFLARE_API_TOKEN : le cache edge est purgé à chaque publication."
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        <a
          href={health.newsSitemapUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          Sitemap News
        </a>
        <a
          href={health.sitemapUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          Sitemap XML
        </a>
        <a
          href={health.videosSitemapUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          Sitemap vidéos
        </a>
        <a
          href={health.feedUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          Flux RSS
        </a>
      </div>
    </div>
  );
}

export function SeoCompetitionPanel() {
  const [data, setData] = useState<SeoCompetitionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [brief, setBrief] = useState<SeoBrief | null>(null);
  const [briefTopic, setBriefTopic] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState('');
  const [manualTopic, setManualTopic] = useState('');
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [draftId, setDraftId] = useState('');
  const [draftError, setDraftError] = useState('');

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchRedaction(
        `/api/redaction/seo/competition${refresh ? '?refresh=1' : ''}`,
        { cache: 'no-store' }
      );
      const payload = await readApiJsonResponse<SeoCompetitionSnapshot & { error?: string }>(
        response
      );
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veille indisponible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const competitorTitles = useMemo(
    () =>
      (data?.competitors ?? [])
        .flatMap((source) => source.headlines.map((headline) => headline.title))
        .slice(0, 10),
    [data]
  );

  async function generateBrief(topic: string, keywords: string[]) {
    const clean = topic.trim();
    if (!clean || briefLoading) return;
    setBriefLoading(true);
    setBriefTopic(clean);
    setBrief(null);
    setBriefError('');
    setDraftId('');
    setDraftError('');
    try {
      const response = await fetchRedaction('/api/redaction/seo/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: clean, keywords, competitorTitles }),
      });
      const payload = await readApiJsonResponse<{ brief?: SeoBrief; error?: string }>(response);
      if (!response.ok || !payload.brief) {
        throw new Error(payload.error || 'Génération impossible');
      }
      setBrief(payload.brief);
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : 'Génération impossible');
    } finally {
      setBriefLoading(false);
    }
  }

  async function copyBrief() {
    if (!brief) return;
    try {
      await navigator.clipboard.writeText(briefToText(brief));
      setDraftError('');
    } catch {
      setDraftError('Copie impossible — sélectionnez le texte manuellement.');
    }
  }

  async function createDraft() {
    if (!brief || creatingDraft) return;
    setCreatingDraft(true);
    setDraftError('');
    setDraftId('');
    try {
      const response = await fetchRedaction('/api/redaction/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `${brief.title} — ${brief.focusKeyphrase}`,
          persist: true,
        }),
      });
      const payload = await readApiJsonResponse<{
        documentId?: string;
        title?: string;
        error?: string;
      }>(response);
      if (!response.ok || !payload.documentId) {
        throw new Error(payload.error || 'Création du brouillon impossible');
      }
      setDraftId(payload.documentId);
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setCreatingDraft(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Veille concurrence & indexation
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Ce que publient actualite.cd, Radio Okapi et les autres maintenant — et les sujets que
            l’IA nous propose de couvrir pour passer devant.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Actualiser
        </button>
      </div>

      {loading && !data ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Lecture des flux concurrents…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-card px-4 py-3 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : null}

      {data ? (
        <>
          <IndexingPanel health={data.indexing} />

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Wab-infos · {data.windowHours} h
              </p>
              <p className="mt-1 text-2xl font-black tabular-nums">{data.ours.recent}</p>
              <p className="text-[11px] text-muted-foreground">articles publiés</p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Concurrence cumulée · {data.windowHours} h
              </p>
              <p className="mt-1 flex items-baseline gap-2 text-2xl font-black tabular-nums">
                {data.totals.competitors}
                {data.totals.ratio > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <TrendingUp className="h-3.5 w-3.5" />×{data.totals.ratio}
                  </span>
                ) : null}
              </p>
              <p className="text-[11px] text-muted-foreground">titres concurrents analysés</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Rythme des concurrents</p>
            <ul className="space-y-1.5">
              {data.competitors.map((source) => (
                <CompetitorRow key={source.id} source={source} />
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">
              Sujets chauds non couverts par Wab-infos
            </p>
            {data.gaps.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                Aucun trou de couverture détecté sur la période — ou flux concurrents
                momentanément indisponibles.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {data.gaps.map((gap) => (
                  <li
                    key={gap.term}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{gap.term}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {gap.competitorCount} reprises · {gap.sources.join(', ')}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setManualTopic(`Sujet : ${gap.term}`);
                        void generateBrief(
                          `Couvrir le sujet « ${gap.term} » traité par ${gap.sources.join(', ')}`,
                          [gap.term]
                        );
                      }}
                      disabled={briefLoading}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
                    >
                      <Sparkles className="h-3 w-3" />
                      Brief IA
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Préparer un sujet</p>
            <div className="flex gap-2">
              <input
                value={manualTopic}
                onChange={(event) => setManualTopic(event.target.value)}
                placeholder="Ex. réforme minière au Katanga"
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => void generateBrief(manualTopic, [])}
                disabled={briefLoading || !manualTopic.trim()}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                {briefLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Générer
              </button>
            </div>
          </div>

          {briefError ? (
            <p className="rounded-xl border border-red-500/30 bg-card px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {briefError}
            </p>
          ) : null}

          {brief ? (
            <div className="space-y-3 rounded-2xl border border-primary/30 bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    Brief IA · {briefTopic.slice(0, 80)}
                  </p>
                  <p className="mt-1 text-sm font-bold leading-snug">{brief.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {brief.angle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void copyBrief()}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[11px] font-semibold"
                >
                  <Copy className="h-3 w-3" />
                  Copier
                </button>
              </div>

              <dl className="grid gap-2 text-xs sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-muted-foreground">Titre SEO</dt>
                  <dd>{brief.seoTitle}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted-foreground">Requête cible</dt>
                  <dd>{brief.focusKeyphrase}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-muted-foreground">Meta description</dt>
                  <dd>{brief.seoDescription}</dd>
                </div>
              </dl>

              {brief.outline.length ? (
                <div className="text-xs">
                  <p className="font-semibold text-muted-foreground">Plan</p>
                  <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                    {brief.outline.map((row) => (
                      <li key={row}>{row}</li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {brief.mustHaveFacts.length ? (
                <div className="text-xs">
                  <p className="font-semibold text-muted-foreground">À vérifier avant publication</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {brief.mustHaveFacts.map((row) => (
                      <li key={row}>{row}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void createDraft()}
                  disabled={creatingDraft}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  {creatingDraft ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Newspaper className="h-3.5 w-3.5" />
                  )}
                  Créer le brouillon
                </button>
                {draftId ? (
                  <a
                    href={`/articles/${draftId}/edit`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold hover:border-primary"
                  >
                    Ouvrir le brouillon
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
                <span className="text-[11px] text-muted-foreground">
                  Urgence : {brief.urgency}
                  {brief.provider ? ` · ${brief.provider}` : ''}
                </span>
              </div>

              {draftError ? (
                <p className="text-xs text-red-600 dark:text-red-400">{draftError}</p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
