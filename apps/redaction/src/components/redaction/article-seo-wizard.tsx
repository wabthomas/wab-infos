'use client';

import { useMemo, useState } from 'react';
import {
  analyzeArticleSeo,
  emptyArticleSeoMeta,
  normalizeArticleSeoMeta,
  seoScoreToneClass,
  type ArticleSchemaType,
  type ArticleSeoMeta,
  type SeoCheck,
  type SeoCheckStatus,
} from '@wab-infos/shared';
import {
  CheckCircle2,
  CircleAlert,
  Info,
  Loader2,
  Radar,
  Search,
  Share2,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type WizardTab = 'analyse' | 'metas' | 'social' | 'avance' | 'indexation';

const TABS: { id: WizardTab; label: string; icon: typeof Search }[] = [
  { id: 'analyse', label: 'Analyse', icon: Radar },
  { id: 'metas', label: 'Métas', icon: Search },
  { id: 'social', label: 'Social', icon: Share2 },
  { id: 'avance', label: 'Avancé', icon: Sparkles },
  { id: 'indexation', label: 'Index', icon: Radar },
];

const SCHEMA_OPTIONS: { id: ArticleSchemaType; label: string }[] = [
  { id: 'NewsArticle', label: 'NewsArticle (actu)' },
  { id: 'Article', label: 'Article' },
  { id: 'BlogPosting', label: 'BlogPosting' },
];

function statusIcon(status: SeoCheckStatus) {
  if (status === 'ok') return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />;
  if (status === 'warn') return <CircleAlert className="h-4 w-4 shrink-0 text-amber-500" />;
  if (status === 'fail') return <XCircle className="h-4 w-4 shrink-0 text-red-500" />;
  return <Info className="h-4 w-4 shrink-0 text-sky-500" />;
}

function scoreTone(score: number): string {
  return seoScoreToneClass(score);
}

function gradeLabel(grade: string): string {
  if (grade === 'great') return 'Excellent';
  if (grade === 'good') return 'Bon';
  if (grade === 'ok') return 'Moyen';
  return 'À améliorer';
}

function SerpPreview({
  siteHost,
  title,
  description,
  path,
}: {
  siteHost: string;
  title: string;
  description: string;
  path: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Aperçu Google
      </p>
      <div className="mt-2 space-y-0.5">
        <p className="truncate text-xs font-medium text-emerald-800 dark:text-emerald-400">
          {siteHost}
          {path}
        </p>
        <p className="line-clamp-2 text-base font-medium leading-snug text-[#1a0dab] dark:text-sky-300">
          {title || 'Titre de l’article'}
        </p>
        <p className="line-clamp-2 text-sm leading-snug text-zinc-700 dark:text-zinc-300">
          {description || 'La meta description apparaîtra ici…'}
        </p>
      </div>
    </div>
  );
}

function ChecksList({ checks, category }: { checks: SeoCheck[]; category?: SeoCheck['category'] }) {
  const filtered = category ? checks.filter((c) => c.category === category) : checks;
  if (filtered.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun contrôle dans cette catégorie.</p>;
  }
  return (
    <ul className="space-y-2">
      {filtered.map((check) => (
        <li
          key={check.id}
          className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5"
        >
          {statusIcon(check.status)}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{check.label}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              {check.message}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface ArticleSeoWizardProps {
  open: boolean;
  onClose: () => void;
  title: string;
  excerpt: string;
  contentHtml: string;
  slug?: string;
  categoryName?: string;
  categorySlug?: string;
  tagNames?: string[];
  hasFeaturedImage: boolean;
  featuredImageAlt?: string;
  featuredImageUrl?: string;
  seoTitle: string;
  onSeoTitleChange: (v: string) => void;
  seoDescription: string;
  onSeoDescriptionChange: (v: string) => void;
  canonicalUrl: string;
  onCanonicalUrlChange: (v: string) => void;
  seoMeta: ArticleSeoMeta;
  onSeoMetaChange: (next: ArticleSeoMeta) => void;
  siteUrl?: string;
  /** Article déjà publié — active le bouton IndexNow. */
  canIndex?: boolean;
  onRequestIndex?: () => Promise<{ ok: boolean; message: string }>;
}

export function ArticleSeoWizard({
  open,
  onClose,
  title,
  excerpt,
  contentHtml,
  slug,
  categoryName,
  categorySlug,
  tagNames,
  hasFeaturedImage,
  featuredImageAlt,
  featuredImageUrl,
  seoTitle,
  onSeoTitleChange,
  seoDescription,
  onSeoDescriptionChange,
  canonicalUrl,
  onCanonicalUrlChange,
  seoMeta,
  onSeoMetaChange,
  siteUrl = 'https://wab-infos.com',
  canIndex = false,
  onRequestIndex,
}: ArticleSeoWizardProps) {
  const [tab, setTab] = useState<WizardTab>('analyse');
  const [indexing, setIndexing] = useState(false);
  const [indexMessage, setIndexMessage] = useState('');

  const meta = useMemo(() => normalizeArticleSeoMeta(seoMeta), [seoMeta]);

  const analysis = useMemo(
    () =>
      analyzeArticleSeo({
        title,
        excerpt,
        contentHtml,
        slug,
        seoTitle,
        seoDescription,
        canonicalUrl,
        hasFeaturedImage,
        featuredImageAlt,
        categoryName,
        tagNames,
        seoMeta: meta,
        siteUrl,
        categorySlug,
      }),
    [
      title,
      excerpt,
      contentHtml,
      slug,
      seoTitle,
      seoDescription,
      canonicalUrl,
      hasFeaturedImage,
      featuredImageAlt,
      categoryName,
      tagNames,
      meta,
      siteUrl,
      categorySlug,
    ]
  );

  const siteHost = useMemo(() => {
    try {
      return new URL(siteUrl).host;
    } catch {
      return 'wab-infos.com';
    }
  }, [siteUrl]);

  const publicPath =
    categorySlug && slug ? ` › ${categorySlug} › ${slug}` : slug ? ` › ${slug}` : '';

  const displayTitle = seoTitle.trim() || title.trim() || 'Titre de l’article';
  const displayDesc = seoDescription.trim() || excerpt.trim();
  const ogTitle = meta.ogTitle.trim() || displayTitle;
  const ogDesc = meta.ogDescription.trim() || displayDesc;
  const ogImage = meta.ogImageUrl.trim() || featuredImageUrl || '';

  function patchMeta(partial: Partial<ArticleSeoMeta>) {
    onSeoMetaChange(normalizeArticleSeoMeta({ ...meta, ...partial }));
  }

  async function handleIndex() {
    if (!onRequestIndex) return;
    setIndexing(true);
    setIndexMessage('');
    try {
      const result = await onRequestIndex();
      setIndexMessage(result.message);
    } catch {
      setIndexMessage('Échec de la demande d’indexation.');
    } finally {
      setIndexing(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl sm:rounded-3xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black tabular-nums',
              scoreTone(analysis.score)
            )}
            title={gradeLabel(analysis.grade)}
          >
            {analysis.score}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-bold leading-tight">Assistant SEO</p>
            <p className="text-xs text-muted-foreground">
              {gradeLabel(analysis.grade)} · {analysis.wordCount} mots
              {meta.focusKeyphrase
                ? ` · densité ${analysis.keyphraseDensity}%`
                : ' · définissez une requête cible'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-2 py-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                tab === id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {tab === 'analyse' ? (
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Requête cible
                </span>
                <input
                  value={meta.focusKeyphrase}
                  onChange={(e) => patchMeta({ focusKeyphrase: e.target.value })}
                  maxLength={120}
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-base outline-none focus:border-primary"
                  placeholder="ex. élections RDC Kinshasa"
                />
              </label>
              <SerpPreview
                siteHost={siteHost}
                title={displayTitle}
                description={displayDesc}
                path={publicPath}
              />
              <ChecksList checks={analysis.checks} />
            </div>
          ) : null}

          {tab === 'metas' ? (
            <div className="space-y-4">
              <SerpPreview
                siteHost={siteHost}
                title={displayTitle}
                description={displayDesc}
                path={publicPath}
              />
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Titre SEO</span>
                <input
                  value={seoTitle}
                  onChange={(e) => onSeoTitleChange(e.target.value)}
                  maxLength={70}
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-base outline-none focus:border-primary"
                />
                <span className="block text-right text-[11px] text-muted-foreground">
                  {seoTitle.length}/70
                </span>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Meta description</span>
                <textarea
                  value={seoDescription}
                  onChange={(e) => onSeoDescriptionChange(e.target.value)}
                  rows={3}
                  maxLength={160}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base outline-none focus:border-primary"
                />
                <span className="block text-right text-[11px] text-muted-foreground">
                  {seoDescription.length}/160
                </span>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Titre fil d’Ariane
                </span>
                <input
                  value={meta.breadcrumbTitle}
                  onChange={(e) => patchMeta({ breadcrumbTitle: e.target.value })}
                  maxLength={80}
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-base outline-none focus:border-primary"
                  placeholder="Par défaut = titre de l’article"
                />
              </label>
              <ChecksList checks={analysis.checks} category="basic" />
              <ChecksList checks={analysis.checks} category="keyphrase" />
            </div>
          ) : null}

          {tab === 'social' ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                {ogImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ogImage} alt="" className="aspect-[1.91/1] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[1.91/1] items-center justify-center bg-muted text-xs text-muted-foreground">
                    Image Open Graph (à la une)
                  </div>
                )}
                <div className="space-y-1 border-t border-border p-3">
                  <p className="text-[11px] uppercase text-muted-foreground">{siteHost}</p>
                  <p className="line-clamp-2 text-sm font-semibold">{ogTitle}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{ogDesc}</p>
                </div>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Titre Facebook / OG</span>
                <input
                  value={meta.ogTitle}
                  onChange={(e) => patchMeta({ ogTitle: e.target.value })}
                  maxLength={70}
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-base outline-none focus:border-primary"
                  placeholder="Par défaut = titre SEO"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Description Facebook / OG
                </span>
                <textarea
                  value={meta.ogDescription}
                  onChange={(e) => patchMeta({ ogDescription: e.target.value })}
                  rows={2}
                  maxLength={200}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base outline-none focus:border-primary"
                  placeholder="Par défaut = meta description"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Image OG (URL, optionnel)
                </span>
                <input
                  value={meta.ogImageUrl}
                  onChange={(e) => patchMeta({ ogImageUrl: e.target.value })}
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-base outline-none focus:border-primary"
                  placeholder="Vide = image à la une"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Titre X / Twitter</span>
                <input
                  value={meta.twitterTitle}
                  onChange={(e) => patchMeta({ twitterTitle: e.target.value })}
                  maxLength={70}
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-base outline-none focus:border-primary"
                  placeholder="Par défaut = titre OG"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Description X / Twitter
                </span>
                <textarea
                  value={meta.twitterDescription}
                  onChange={(e) => patchMeta({ twitterDescription: e.target.value })}
                  rows={2}
                  maxLength={200}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base outline-none focus:border-primary"
                  placeholder="Par défaut = description OG"
                />
              </label>
            </div>
          ) : null}

          {tab === 'avance' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Robots
                </p>
                {(
                  [
                    ['robotsIndex', 'Index (autoriser Google)'],
                    ['robotsFollow', 'Follow (suivre les liens)'],
                    ['robotsNoArchive', 'noarchive'],
                    ['robotsNoImageIndex', 'noimageindex'],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                  >
                    <span className="text-sm font-medium">{label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(meta[key])}
                      onChange={(e) => patchMeta({ [key]: e.target.checked })}
                      className="h-5 w-5 accent-primary"
                    />
                  </label>
                ))}
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Schema.org</span>
                <select
                  value={meta.schemaType}
                  onChange={(e) =>
                    patchMeta({ schemaType: e.target.value as ArticleSchemaType })
                  }
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-base outline-none focus:border-primary"
                >
                  {SCHEMA_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">URL canonique</span>
                <input
                  type="url"
                  value={canonicalUrl}
                  onChange={(e) => onCanonicalUrlChange(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-base outline-none focus:border-primary"
                  placeholder="Vide = URL publique auto"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                <span>
                  <span className="block text-sm font-medium">Contenu pilier</span>
                  <span className="text-xs text-muted-foreground">
                    Article de référence à lier depuis d’autres pages
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={meta.isPillarContent}
                  onChange={(e) => patchMeta({ isPillarContent: e.target.checked })}
                  className="h-5 w-5 accent-primary"
                />
              </label>

              <button
                type="button"
                onClick={() => onSeoMetaChange(emptyArticleSeoMeta())}
                className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
              >
                Réinitialiser les options avancées
              </button>
            </div>
          ) : null}

          {tab === 'indexation' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-display text-base font-bold">Indexation en un clic</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Envoie l’URL à IndexNow (Bing, Yandex…) et à Google Indexing API, puis rafraîchit
                  le cache du site — comme « Request Indexing » chez Rank Math.
                </p>
                <button
                  type="button"
                  disabled={!canIndex || indexing || !onRequestIndex}
                  onClick={() => void handleIndex()}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {indexing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {canIndex ? 'Indexer maintenant' : 'Publiez d’abord l’article'}
                </button>
                {indexMessage ? (
                  <p className="mt-3 text-sm text-muted-foreground">{indexMessage}</p>
                ) : null}
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  Sitemap news :{' '}
                  <a
                    href={`${siteUrl}/sitemap-news.xml`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    /sitemap-news.xml
                  </a>
                </li>
                <li>
                  Sitemap :{' '}
                  <a
                    href={`${siteUrl}/sitemap.xml`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    /sitemap.xml
                  </a>
                </li>
                <li>
                  Flux RSS :{' '}
                  <a
                    href={`${siteUrl}/feed.xml`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    /feed.xml
                  </a>
                </li>
              </ul>
              {!meta.robotsIndex ? (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                  noindex est activé — Google n’indexera pas cet article même après une demande
                  d’indexation.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Badge score compact pour la barre d’outils éditeur. */
export function SeoScoreBadge({
  score,
  onClick,
}: {
  score: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold tabular-nums',
        scoreTone(score)
      )}
      title="Ouvrir l’assistant SEO"
    >
      SEO {score}
    </button>
  );
}
