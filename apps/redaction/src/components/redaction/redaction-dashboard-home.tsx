import Link from 'next/link';
import { Suspense } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  Eye,
  FileText,
  MessageSquare,
  PenLine,
  Settings,
  Zap,
} from 'lucide-react';
import type { RedactionArticle, RedactionStats } from '@/lib/redaction/types';
import { ArticleListItem } from '@/components/redaction/article-list-item';
import {
  DashboardActivitySection,
  DashboardAnalyticsSkeleton,
  DashboardAnalyticsSummary,
  DashboardPublishedWeekHint,
  DashboardTopArticlesSection,
} from '@/components/redaction/dashboard-analytics-sections';
import { cn } from '@/lib/utils';

interface RedactionDashboardHomeProps {
  firstName: string;
  authorName: string;
  authorDocumentId: string;
  isSuperAdmin: boolean;
  canDeleteAnyArticle: boolean;
  stats: RedactionStats;
  latestPublished: RedactionArticle[];
  recentDrafts: RedactionArticle[];
  pendingComments: number;
  showViews: boolean;
}

const STAT_ACCENTS = {
  published: 'bg-emerald-500/10 text-emerald-700',
  draft: 'bg-amber-500/10 text-amber-700',
  scheduled: 'bg-sky-500/10 text-sky-700',
  views: 'bg-primary/10 text-primary',
  breaking: 'bg-red-500/10 text-red-600',
} as const;

export function RedactionDashboardHome({
  firstName,
  authorName,
  authorDocumentId,
  isSuperAdmin,
  canDeleteAnyArticle,
  stats,
  latestPublished,
  recentDrafts,
  pendingComments,
  showViews,
}: RedactionDashboardHomeProps) {
  const todayLabel = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });
  const publishRate =
    stats.totalArticles > 0 ? Math.round((stats.publishedCount / stats.totalArticles) * 100) : 0;

  return (
    <div className="space-y-4 lg:space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 lg:p-8">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 left-1/4 h-36 w-36 rounded-full bg-primary/5 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary lg:sr-only">Tableau de bord</p>
            <h1 className="mt-0.5 font-display text-xl font-bold lg:mt-1 lg:text-3xl">Bonjour, {firstName}</h1>
            <p className="mt-1 hidden text-sm capitalize text-muted-foreground lg:block">{todayLabel}</p>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground lg:mt-2">
              <span className="hidden lg:inline">
                {isSuperAdmin
                  ? `Vue d'ensemble de la rédaction — connecté en tant que ${authorName}.`
                  : 'Suivez vos publications, brouillons et performances en un coup d\'œil.'}
              </span>
            </p>
          </div>

          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            <Link
              href="/stats"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold transition-colors hover:bg-muted"
            >
              <BarChart3 className="h-4 w-4" />
              Statistiques
            </Link>
            <Link
              href="/nouveau"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-transform hover:brightness-105 active:scale-[0.98]"
            >
              <PenLine className="h-4 w-4" />
              Nouvel article
            </Link>
          </div>
        </div>
      </section>

      {/* Alerte commentaires */}
      {pendingComments > 0 ? (
        <Link
          href="/comments"
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 transition-colors hover:bg-amber-100/80 lg:px-5 lg:py-4"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700">
            <MessageSquare className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-amber-950">
              {pendingComments} commentaire{pendingComments > 1 ? 's' : ''} en attente
            </span>
            <span className="text-xs text-amber-800/80">Modération requise — appuyez pour ouvrir</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-amber-700" />
        </Link>
      ) : null}

      {/* Stats */}
      <section aria-labelledby="dashboard-stats-heading">
        <h2
          id="dashboard-stats-heading"
          className="sr-only lg:not-sr-only lg:mb-4 lg:font-display lg:text-lg lg:font-bold"
        >
          Indicateurs
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:grid-cols-5 xl:gap-4">
          <StatCard
            icon={FileText}
            label="Publiés"
            value={stats.publishedCount}
            href="/articles?filter=published"
            accent={STAT_ACCENTS.published}
          />
          <StatCard
            icon={PenLine}
            label="Brouillons"
            value={stats.draftCount}
            href="/articles?filter=draft"
            accent={STAT_ACCENTS.draft}
          />
          <StatCard
            icon={CalendarClock}
            label="Planifiés"
            value={stats.scheduledCount}
            href="/articles?filter=scheduled"
            accent={STAT_ACCENTS.scheduled}
          />
          <StatCard
            icon={Eye}
            label="Vues totales"
            mobileLabel="Vues"
            value={stats.totalViews.toLocaleString('fr-FR')}
            href="/stats"
            accent={STAT_ACCENTS.views}
          />
          <StatCard
            icon={Zap}
            label="Flash"
            value={stats.breakingCount}
            href="/articles?filter=published"
            accent={STAT_ACCENTS.breaking}
          />
        </div>
      </section>

      {/* Corps principal : 2 colonnes desktop */}
      <div className="grid gap-6 xl:grid-cols-12 xl:gap-8">
        <div className="space-y-6 xl:col-span-8 xl:space-y-8">
          <Suspense fallback={<DashboardAnalyticsSkeleton variant="chart" />}>
            <DashboardActivitySection authorDocumentId={authorDocumentId} />
          </Suspense>

          {/* Articles récents */}
          <section
            className="rounded-2xl border border-border bg-card p-4 lg:p-6"
            aria-labelledby="dashboard-recent-heading"
          >
            <div className="mb-3 flex items-center justify-between gap-2 lg:mb-5">
              <div className="min-w-0">
                <h2 id="dashboard-recent-heading" className="font-display text-base font-bold lg:text-xl">
                  Dernières publications
                </h2>
                <Suspense fallback={<DashboardAnalyticsSkeleton variant="hint" />}>
                  <DashboardPublishedWeekHint authorDocumentId={authorDocumentId} />
                </Suspense>
              </div>
              <Link
                href="/articles?filter=published"
                className="shrink-0 text-xs font-medium text-primary transition-colors hover:underline sm:text-sm"
              >
                Tout voir
                <ArrowRight className="ml-0.5 hidden h-3.5 w-3.5 lg:inline" />
              </Link>
            </div>

            <ul className="divide-y divide-border/60 lg:space-y-3 lg:divide-y-0">
              {latestPublished.length === 0 ? (
                <li className="rounded-xl border border-dashed border-border p-8 text-center lg:p-12">
                  <p className="text-sm text-muted-foreground">Aucun article publié pour l&apos;instant.</p>
                  <Link
                    href="/nouveau"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    <PenLine className="h-4 w-4" />
                    Écrire votre premier article
                  </Link>
                </li>
              ) : (
                latestPublished.map((article) => (
                  <li key={article.documentId} className="py-2.5 first:pt-0 last:pb-0 lg:py-0">
                    <ArticleListItem
                      article={article}
                      canDeleteAny={canDeleteAnyArticle}
                      showAuthor={isSuperAdmin}
                      showViews={showViews}
                      canManagePublication={isSuperAdmin}
                      variant="comfortable"
                      layout="compact"
                    />
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>

        {/* Colonne latérale */}
        <aside className="space-y-4 lg:space-y-6 xl:col-span-4">
          {/* Résumé rapide — desktop uniquement (doublon des stats sur mobile) */}
          <section className="hidden rounded-2xl border border-border bg-card p-5 lg:block">
            <h2 className="font-display text-base font-bold">En bref</h2>
            <dl className="mt-4 space-y-3">
              <SummaryRow label="Articles au total" value={String(stats.totalArticles)} />
              <SummaryRow label="Taux publiés" value={`${publishRate} %`} />
              <Suspense fallback={<DashboardAnalyticsSkeleton variant="summary" />}>
                <DashboardAnalyticsSummary
                  authorDocumentId={authorDocumentId}
                  pendingComments={pendingComments}
                />
              </Suspense>
            </dl>
          </section>

          {/* Actions rapides — desktop (navigation mobile + FAB) */}
          <section className="hidden rounded-2xl border border-border bg-card p-5 lg:block">
            <h2 className="font-display text-base font-bold">Actions rapides</h2>
            <nav className="mt-3 flex flex-col gap-1">
              <QuickAction href="/nouveau" icon={PenLine} label="Nouvel article" primary />
              <QuickAction href="/articles?filter=draft" icon={FileText} label="Mes brouillons" />
              {pendingComments > 0 ? (
                <QuickAction
                  href="/comments"
                  icon={MessageSquare}
                  label={`Modérer (${pendingComments})`}
                  badge
                />
              ) : (
                <QuickAction href="/comments" icon={MessageSquare} label="Commentaires" />
              )}
              <QuickAction href="/stats" icon={BarChart3} label="Statistiques détaillées" />
              {isSuperAdmin ? (
                <QuickAction href="/parametres" icon={Settings} label="Paramètres du site" />
              ) : null}
            </nav>
          </section>

          {/* Brouillons à reprendre */}
          {recentDrafts.length > 0 ? (
            <section className="rounded-2xl border border-border bg-card p-4 lg:p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-base font-bold">À reprendre</h2>
                <Link href="/articles?filter=draft" className="text-xs font-medium text-primary hover:underline">
                  Tous
                </Link>
              </div>
              <ul className="mt-3 space-y-2">
                {recentDrafts.map((article) => (
                  <li key={article.documentId}>
                    <Link
                      href={`/articles/${article.documentId}/edit`}
                      className="block rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/30 hover:bg-muted/50"
                    >
                      <p className="line-clamp-2 text-sm font-semibold leading-snug">
                        {article.title || 'Sans titre'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Brouillon · continuer l&apos;écriture</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <Suspense fallback={<DashboardAnalyticsSkeleton variant="top" />}>
            <DashboardTopArticlesSection authorDocumentId={authorDocumentId} showViews={showViews} />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  mobileLabel,
  value,
  href,
  accent,
  className,
}: {
  icon: typeof FileText;
  label: string;
  mobileLabel?: string;
  value: string | number;
  href: string;
  accent: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group rounded-lg border border-border bg-card transition-all',
        'p-2.5 active:border-primary/40 active:bg-primary/5',
        'lg:rounded-xl lg:p-5 lg:hover:border-primary/30 lg:hover:shadow-sm',
        className
      )}
    >
      <div className="flex items-center gap-2 lg:block">
        <div className="flex shrink-0 items-start justify-between lg:w-full">
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md lg:h-10 lg:w-10 lg:rounded-lg',
              accent
            )}
          >
            <Icon className="h-3.5 w-3.5 lg:h-[18px] lg:w-[18px]" />
          </span>
          <ArrowRight className="hidden h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 lg:block" />
        </div>
        <div className="min-w-0 flex-1 lg:mt-3 lg:flex-none">
          <p className="font-display text-lg font-bold leading-none lg:text-3xl">{value}</p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground lg:mt-0.5 lg:text-sm">
            {mobileLabel ? (
              <>
                <span className="lg:hidden">{mobileLabel}</span>
                <span className="hidden lg:inline">{label}</span>
              </>
            ) : (
              label
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}

function SummaryRow({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right">
        <span className={cn('text-sm font-bold', valueClassName)}>{value}</span>
        {hint ? <span className="mt-0.5 block text-[10px] text-muted-foreground">{hint}</span> : null}
      </dd>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  primary,
  badge,
}: {
  href: string;
  icon: typeof PenLine;
  label: string;
  primary?: boolean;
  badge?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
        primary
          ? 'bg-primary/10 text-primary hover:bg-primary/15'
          : 'text-foreground hover:bg-muted',
        badge && 'ring-1 ring-amber-200/80'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
    </Link>
  );
}
