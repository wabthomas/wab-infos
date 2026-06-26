'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Eye,
  FileText,
  Globe,
  Heart,
  Loader2,
  MessageSquare,
  MousePointerClick,
  Rss,
  TrendingUp,
  Users,
} from 'lucide-react';
import { formatStatsDate } from '@/lib/redaction/admin-analytics';
import type { AdminAnalytics, AdminStatsRange } from '@/lib/redaction/types';
import { cn } from '@/lib/utils';

const SITE_TABS = [
  { id: 'traffic', label: 'Trafic', icon: Eye },
  { id: 'trends', label: 'Tendances', icon: TrendingUp },
  { id: 'subscribers', label: 'Abonnés', icon: Rss },
  { id: 'referrers', label: 'Référents', icon: MousePointerClick },
  { id: 'countries', label: 'Pays', icon: Globe },
  { id: 'comments', label: 'Commentaires', icon: MessageSquare },
] as const;

const AUTHOR_TABS = [
  { id: 'traffic', label: 'Trafic', icon: Eye },
  { id: 'trends', label: 'Tendances', icon: TrendingUp },
  { id: 'comments', label: 'Commentaires', icon: MessageSquare },
] as const;

type TabId = (typeof SITE_TABS)[number]['id'];

const RANGES: AdminStatsRange[] = [7, 30, 90, 365];

const CHART_COLORS = [
  'hsl(var(--primary))',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#16a34a',
  '#0891b2',
  '#64748b',
];

function formatNumber(n: number): string {
  return n.toLocaleString('fr-FR');
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-bold">{title}</h3>
      {children}
    </section>
  );
}

function tabPanelClass(active: boolean): string {
  return cn('space-y-4', !active && 'hidden');
}

export function AdminStatsDashboard({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  type StatsScope = 'mine' | 'site';
  const [scope, setScope] = useState<StatsScope>(isSuperAdmin ? 'site' : 'mine');
  const [tab, setTab] = useState<TabId>('traffic');
  const [days, setDays] = useState<AdminStatsRange>(30);
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const cacheRef = useRef<Map<string, AdminAnalytics>>(new Map());

  const isSiteScope = scope === 'site';
  const tabs = isSiteScope ? SITE_TABS : AUTHOR_TABS;

  const load = useCallback(async (range: AdminStatsRange, activeScope: StatsScope) => {
    const cacheKey = `${activeScope}-${range}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setData(cached);
      setInitialLoading(false);
    } else {
      setInitialLoading(true);
    }
    setRefreshing(true);
    setError('');
    try {
      const endpoint =
        activeScope === 'site'
          ? `/api/redaction/admin/analytics?days=${range}`
          : `/api/redaction/analytics?days=${range}`;
      const res = await fetch(endpoint);
      const body = (await res.json()) as { analytics?: AdminAnalytics; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Chargement impossible');
      const analytics = body.analytics ?? null;
      if (analytics) cacheRef.current.set(cacheKey, analytics);
      setData(analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      if (!cached) setData(null);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(days, scope);
  }, [days, scope, load]);

  useEffect(() => {
    if (!tabs.some((t) => t.id === tab)) {
      setTab('traffic');
    }
  }, [tab, tabs]);

  const trafficChart = useMemo(
    () =>
      data?.traffic.map((p, index) => ({
        label: formatStatsDate(p.date),
        publications: p.value,
        commentaires: data.trends.comments[index]?.value ?? 0,
      })) ?? [],
    [data]
  );

  const trendsArticlesChart = useMemo(
    () =>
      data?.trends.articles.map((p) => ({
        label: formatStatsDate(p.date),
        value: p.value,
      })) ?? [],
    [data]
  );

  const trendsCommentsChart = useMemo(
    () =>
      data?.trends.comments.map((p) => ({
        label: formatStatsDate(p.date),
        value: p.value,
      })) ?? [],
    [data]
  );

  const subscribersGrowthChart = useMemo(
    () =>
      data?.subscribers.growth.map((p) => ({
        label: formatStatsDate(p.date),
        value: p.value,
      })) ?? [],
    [data]
  );

  const topCategoriesChart = useMemo(
    () =>
      data?.topCategories.map((c) => ({
        name: c.name.length > 18 ? `${c.name.slice(0, 18)}…` : c.name,
        vues: c.value,
      })) ?? [],
    [data]
  );

  return (
    <div className="space-y-4 pb-8">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold">
          {isSiteScope ? 'Statistiques du site' : 'Mes statistiques'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isSiteScope
            ? 'Vue d\'ensemble — trafic, abonnés, commentaires et contenu'
            : 'Vues, publications et commentaires sur vos articles'}
        </p>
      </div>

      {isSuperAdmin ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setScope('mine')}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              scope === 'mine'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            Mes articles
          </button>
          <button
            type="button"
            onClick={() => setScope('site')}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              scope === 'site'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            Tout le site
          </button>
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {RANGES.map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => setDays(range)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              days === range
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {range === 365 ? '1 an' : `${range} j`}
          </button>
        ))}
      </div>

      <div className="sticky top-[max(3.5rem,env(safe-area-inset-top))] z-30 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur">
        <div className="flex gap-1 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide',
                tab === id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground active:bg-muted'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {initialLoading && !data ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error && !data ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : data ? (
        <div className={cn('relative space-y-4', refreshing && 'opacity-80')}>
          {refreshing ? (
            <div className="pointer-events-none absolute right-0 top-0 z-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              icon={Eye}
              label="Vues cumulées"
              value={formatNumber(data.summary.views)}
              hint={isSiteScope ? 'Total Strapi (tous articles publiés)' : 'Mes articles publiés'}
            />
            <KpiCard
              icon={MessageSquare}
              label={`Commentaires (${days} j)`}
              value={formatNumber(data.summary.comments)}
              hint={
                data.summary.pendingComments > 0
                  ? `${data.summary.pendingComments} en attente au total (toutes périodes)`
                  : undefined
              }
            />
            <KpiCard
              icon={TrendingUp}
              label={`Publiés (${days} j)`}
              value={formatNumber(data.summary.published)}
              hint={`${data.summary.publishedTotal} publiés au total`}
            />
            {isSiteScope ? (
              <KpiCard
                icon={Rss}
                label="Abonnés"
                value={formatNumber(data.summary.subscribers)}
                hint={`${data.summary.pushSubscribers} push`}
              />
            ) : (
              <KpiCard
                icon={FileText}
                label="Mes articles"
                value={formatNumber(data.summary.articles)}
                hint="Tous statuts confondus"
              />
            )}
          </div>

          {data.dataSources.geoEstimated && (
            <p className="text-[11px] text-muted-foreground">
              L&apos;onglet Pays reste une estimation indicative. Les vues et publications viennent
              directement de Strapi.
            </p>
          )}

          <div className={tabPanelClass(tab === 'traffic')}>
              <ChartCard title="Publications et commentaires">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trafficChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} width={36} allowDecimals={false} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="publications"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        name="Publications"
                      />
                      <Line
                        type="monotone"
                        dataKey="commentaires"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        dot={false}
                        name="Commentaires"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Articles les plus lus">
                <ol className="space-y-2">
                  {data.topArticles.slice(0, 10).map((article, index) => (
                    <li
                      key={article.documentId}
                      className="flex items-start gap-3 rounded-lg bg-muted/40 px-3 py-2"
                    >
                      <span className="mt-0.5 text-xs font-bold text-primary">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug">
                          {article.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {article.category ?? '—'} · {formatNumber(article.views)} vues
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </ChartCard>
          </div>

          <div className={tabPanelClass(tab === 'trends')}>
              <ChartCard title="Publications">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendsArticlesChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" name="Articles" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Commentaires reçus">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendsCommentsChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#7c3aed" name="Commentaires" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <div className="grid grid-cols-3 gap-2">
                <KpiCard
                  icon={Heart}
                  label="Publiés (période)"
                  value={formatNumber(data.summary.published)}
                />
                <KpiCard
                  icon={TrendingUp}
                  label="Publiés (total)"
                  value={formatNumber(data.summary.publishedTotal)}
                />
                <KpiCard
                  icon={Eye}
                  label="Vues cumulées"
                  value={formatNumber(data.summary.views)}
                />
              </div>
          </div>

          <div className={tabPanelClass(tab === 'subscribers')}>
              <div className="grid grid-cols-2 gap-3">
                <KpiCard
                  icon={Rss}
                  label="Newsletter actifs"
                  value={formatNumber(data.subscribers.active)}
                />
                <KpiCard
                  icon={Users}
                  label="Désabonnés"
                  value={formatNumber(data.subscribers.unsubscribed)}
                />
              </div>

              <ChartCard title="Nouveaux abonnés">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={subscribersGrowthChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#16a34a"
                        strokeWidth={2}
                        dot={false}
                        name="Abonnés"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              {data.subscribers.sources.length > 0 && (
                <ChartCard title="Sources d&apos;inscription">
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.subscribers.sources}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={72}
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                        >
                          {data.subscribers.sources.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              )}
          </div>

          <div className={tabPanelClass(tab === 'referrers')}>
              <p className="text-sm text-muted-foreground">
                Répartition des vues par rubrique (proxy des sources de trafic interne).
              </p>
              <ChartCard title="Rubriques les plus consultées">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={topCategoriesChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={88} />
                      <Tooltip />
                      <Bar dataKey="vues" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Part du trafic par rubrique (%)">
                <ul className="space-y-2">
                  {data.referrers.map((item) => (
                    <li key={item.name}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">{item.value} %</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </ChartCard>
          </div>

          <div className={tabPanelClass(tab === 'countries')}>
              {data.dataSources.geoEstimated && (
                <p className="text-sm text-muted-foreground">
                  Estimation indicative basée sur le profil audience RDC. Pour des données précises,
                  connectez GA4 (GA_PROPERTY_ID).
                </p>
              )}
              <ChartCard title="Répartition estimée des lectures par pays">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.countries.map((c) => ({
                        name: c.name.length > 14 ? `${c.name.slice(0, 14)}…` : c.name,
                        lectures: c.value,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={56} />
                      <YAxis tick={{ fontSize: 10 }} width={36} />
                      <Tooltip />
                      <Bar dataKey="lectures" fill="#0891b2" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
          </div>

          <div className={tabPanelClass(tab === 'comments')}>
              <div className="grid grid-cols-3 gap-2">
                <KpiCard
                  icon={MessageSquare}
                  label="En attente"
                  value={formatNumber(data.comments.pending)}
                />
                <KpiCard
                  icon={Heart}
                  label="Approuvés"
                  value={formatNumber(data.comments.approved)}
                />
                <KpiCard
                  icon={Users}
                  label="Rejetés"
                  value={formatNumber(data.comments.rejected)}
                />
              </div>

              <ChartCard title="Commentaires par jour">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.comments.timeline.map((p) => ({
                        label: formatStatsDate(p.date),
                        value: p.value,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#db2777"
                        strokeWidth={2}
                        dot={false}
                        name="Commentaires"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
