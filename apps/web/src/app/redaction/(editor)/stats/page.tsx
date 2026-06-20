import { Eye, FileText, PenLine, TrendingUp } from 'lucide-react';
import { getEditorStats, listEditorArticles, requireRedactionUser } from '@/lib/redaction/strapi-editor';
import { formatArticleDate, getArticleDisplayDate } from '@/lib/utils';

export default async function RedactionStatsPage() {
  const user = await requireRedactionUser();
  const [stats, articles] = await Promise.all([
    getEditorStats(user),
    listEditorArticles(user, 'published'),
  ]);

  const topByViews = [...articles]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Statistiques</h1>

      <div className="space-y-3">
        <SummaryRow icon={FileText} label="Articles publiés" value={stats.publishedCount} />
        <SummaryRow icon={PenLine} label="Brouillons en cours" value={stats.draftCount} />
        <SummaryRow icon={Eye} label="Vues cumulées" value={stats.totalViews.toLocaleString('fr-FR')} />
        <SummaryRow icon={TrendingUp} label="Articles flash" value={stats.breakingCount} />
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Top vues</h2>
        {topByViews.length === 0 ? (
          <p className="text-sm text-muted-foreground">Pas encore de données</p>
        ) : (
          <ol className="space-y-2">
            {topByViews.map((article, index) => (
              <li
                key={article.documentId}
                className="flex gap-3 rounded-xl border border-border bg-card p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-semibold leading-snug">{article.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatArticleDate(getArticleDisplayDate(article))}
                  </p>
                  <p className="mt-1 text-sm font-bold text-primary">
                    {article.viewCount.toLocaleString('fr-FR')} vues
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <Icon className="h-5 w-5 text-primary" />
      <span className="flex-1 text-sm">{label}</span>
      <span className="font-display text-lg font-bold">{value}</span>
    </div>
  );
}
