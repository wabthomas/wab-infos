import { AdminStatsDashboard } from '@/components/redaction/admin-stats-dashboard';
import { getEditorProfile, requireRedactionUser } from '@/lib/redaction/strapi-editor';

export default async function RedactionStatsPage() {
  const user = await requireRedactionUser();
  const { isSuperAdmin } = await getEditorProfile(user);

  return <AdminStatsDashboard isSuperAdmin={isSuperAdmin} />;
}
