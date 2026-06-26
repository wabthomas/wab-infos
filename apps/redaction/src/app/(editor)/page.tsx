import Link from 'next/link';
import { PenLine, FileText, Eye, Zap, CalendarClock } from 'lucide-react';
import { getEditorProfile, computeEditorStats, listEditorArticles, requireRedactionUser } from '@/lib/redaction/strapi-editor';
import { ArticleListItem } from '@/components/redaction/article-list-item';
import { cn } from '@/lib/utils';

export default async function RedactionDashboardPage() {
  const user = await requireRedactionUser();
  const [{ author, canDeleteAnyArticle }, articles] = await Promise.all([
    getEditorProfile(user),
    listEditorArticles(user, 'all'),
  ]);
  const stats = computeEditorStats(articles);
  const latest = articles.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Bonjour, {author.name.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Rédigez et publiez depuis votre mobile</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={FileText}
          label="Publiés"
          value={stats.publishedCount}
          href="/articles?filter=published"
        />
        <StatCard
          icon={PenLine}
          label="Brouillons"
          value={stats.draftCount}
          href="/articles?filter=draft"
        />
        <StatCard
          icon={CalendarClock}
          label="Planifiés"
          value={stats.scheduledCount}
          href="/articles?filter=scheduled"
        />
        <StatCard
          icon={Eye}
          label="Vues totales"
          value={stats.totalViews.toLocaleString('fr-FR')}
          href="/stats"
        />
        <StatCard
          icon={Zap}
          label="Flash actifs"
          value={stats.breakingCount}
          href="/articles?filter=published"
          className="col-span-2"
        />
      </div>

      <Link
        href="/nouveau"
        className="flex h-14 items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/20"
      >
        <PenLine className="h-5 w-5" />
        Nouvel article
      </Link>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Récents</h2>
          <Link href="/articles" className="text-sm font-medium text-primary">
            Tout voir
          </Link>
        </div>
        <ul className="space-y-2">
          {latest.length === 0 && (
            <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Aucun article pour l&apos;instant
            </li>
          )}
          {latest.map((article) => (
            <li key={article.documentId}>
              <ArticleListItem article={article} canDeleteAny={canDeleteAnyArticle} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  className,
}: {
  icon: typeof FileText;
  label: string;
  value: string | number;
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-xl border border-border bg-card p-4 transition-colors active:border-primary/40 active:bg-primary/5',
        className
      )}
    >
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Link>
  );
}
