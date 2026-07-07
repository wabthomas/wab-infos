import { getAuthorAnalytics } from '@/lib/redaction/admin-analytics';
import {
  countPendingComments,
  getEditorProfile,
  getEditorStats,
  listEditorArticles,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';
import { getEditorSiteSettings } from '@/lib/redaction/site-settings';
import { RedactionDashboardHome } from '@/components/redaction/redaction-dashboard-home';

export default async function RedactionDashboardPage() {
  const user = await requireRedactionUser();
  const { author, canDeleteAnyArticle, isSuperAdmin } = await getEditorProfile(user);

  const [stats, { articles: latestPublished }, { articles: recentDrafts }, siteSettings, pendingComments, analytics] =
    await Promise.all([
      getEditorStats(user),
      listEditorArticles(user, 'published', { omitContent: true, page: 1, pageSize: 5 }),
      listEditorArticles(user, 'draft', { omitContent: true, page: 1, pageSize: 3 }),
      getEditorSiteSettings(),
      countPendingComments(),
      getAuthorAnalytics(author.documentId, 7),
    ]);

  return (
    <RedactionDashboardHome
      firstName={author.name.split(' ')[0]}
      authorName={author.name}
      isSuperAdmin={isSuperAdmin}
      canDeleteAnyArticle={canDeleteAnyArticle}
      stats={stats}
      analytics={analytics}
      latestPublished={latestPublished}
      recentDrafts={recentDrafts}
      pendingComments={pendingComments}
      showViews={siteSettings.showArticleViewCounts}
    />
  );
}
