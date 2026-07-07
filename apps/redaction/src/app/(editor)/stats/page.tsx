import { AdminStatsDashboard } from '@/components/redaction/admin-stats-dashboard';
import { getAdminAnalytics, getAuthorAnalytics } from '@/lib/redaction/admin-analytics';
import { getEditorProfile, requireRedactionUser } from '@/lib/redaction/strapi-editor';

export default async function RedactionStatsPage() {
  const user = await requireRedactionUser();
  const { isSuperAdmin, author } = await getEditorProfile(user);
  const initialAnalytics = isSuperAdmin
    ? await getAdminAnalytics(30)
    : await getAuthorAnalytics(author.documentId, 30);

  return (
    <AdminStatsDashboard
      isSuperAdmin={isSuperAdmin}
      initialAnalytics={initialAnalytics}
      initialScope={isSuperAdmin ? 'site' : 'mine'}
      initialDays={30}
    />
  );
}
