import { cache } from 'react';
import Link from 'next/link';
import { getAuthorAnalytics } from '@/lib/redaction/admin-analytics';
import { DashboardActivityChart } from '@/components/redaction/dashboard-activity-chart';

const getDashboardAnalytics = cache((authorDocumentId: string) =>
  getAuthorAnalytics(authorDocumentId, 7)
);

export async function DashboardActivitySection({
  authorDocumentId,
}: {
  authorDocumentId: string;
}) {
  const analytics = await getDashboardAnalytics(authorDocumentId);

  return (
    <section
      className="rounded-2xl border border-border bg-card p-4 lg:p-6"
      aria-labelledby="dashboard-activity-heading"
    >
      <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h2 id="dashboard-activity-heading" className="font-display text-base font-bold lg:text-lg">
            Activité — 7 jours
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Publications et commentaires reçus
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground sm:gap-4 sm:text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Publications
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Commentaires
          </span>
        </div>
      </div>
      <DashboardActivityChart
        publications={analytics.trends.articles}
        comments={analytics.trends.comments}
      />
    </section>
  );
}

export async function DashboardPublishedWeekHint({
  authorDocumentId,
}: {
  authorDocumentId: string;
}) {
  const analytics = await getDashboardAnalytics(authorDocumentId);

  return (
    <p className="mt-0.5 hidden text-sm text-muted-foreground lg:block">
      {analytics.summary.published} publié{analytics.summary.published > 1 ? 's' : ''} cette semaine
    </p>
  );
}

export async function DashboardAnalyticsSummary({
  authorDocumentId,
  pendingComments,
}: {
  authorDocumentId: string;
  pendingComments: number;
}) {
  const analytics = await getDashboardAnalytics(authorDocumentId);

  return (
    <>
      <SummaryRow
        label="Vues (7 j.)"
        value={analytics.summary.views.toLocaleString('fr-FR')}
        hint="cumul articles publiés"
      />
      {pendingComments > 0 ? (
        <SummaryRow
          label="Modération"
          value={String(pendingComments)}
          valueClassName="text-amber-700"
        />
      ) : null}
    </>
  );
}

export async function DashboardTopArticlesSection({
  authorDocumentId,
  showViews,
}: {
  authorDocumentId: string;
  showViews: boolean;
}) {
  if (!showViews) return null;

  const analytics = await getDashboardAnalytics(authorDocumentId);
  if (!analytics.topArticles.length) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold">Top lectures</h2>
        <Link href="/stats" className="text-xs font-medium text-primary hover:underline">
          Détails
        </Link>
      </div>
      <ol className="mt-3 space-y-2">
        {analytics.topArticles.slice(0, 5).map((article, index) => (
          <li key={article.documentId}>
            <Link
              href={`/articles/${article.documentId}/edit`}
              className="flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-muted/60"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-medium leading-snug">{article.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {article.views.toLocaleString('fr-FR')} vues
                  {article.category ? ` · ${article.category}` : ''}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
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
        <span className={`text-sm font-bold ${valueClassName ?? ''}`}>{value}</span>
        {hint ? <span className="mt-0.5 block text-[10px] text-muted-foreground">{hint}</span> : null}
      </dd>
    </div>
  );
}

export function DashboardAnalyticsSkeleton({ variant }: { variant: 'chart' | 'hint' | 'summary' | 'top' }) {
  if (variant === 'chart') {
    return (
      <section className="rounded-2xl border border-border bg-card p-4 lg:p-6">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </section>
    );
  }

  if (variant === 'hint') {
    return <div className="mt-0.5 hidden h-4 w-44 animate-pulse rounded bg-muted lg:block" />;
  }

  if (variant === 'summary') {
    return (
      <>
        <div className="h-10 animate-pulse rounded bg-muted" />
        <div className="h-10 animate-pulse rounded bg-muted" />
      </>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="h-5 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-4 space-y-2">
        <div className="h-12 animate-pulse rounded-xl bg-muted" />
        <div className="h-12 animate-pulse rounded-xl bg-muted" />
        <div className="h-12 animate-pulse rounded-xl bg-muted" />
      </div>
    </section>
  );
}
