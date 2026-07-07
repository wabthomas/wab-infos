import { Suspense } from 'react';
import { RedactionArticlesList } from '@/components/redaction/redaction-articles-list';
import { getEditorProfile, requireRedactionUser } from '@/lib/redaction/strapi-editor';
import { getEditorSiteSettings } from '@/lib/redaction/site-settings';

export default async function RedactionArticlesPage() {
  const user = await requireRedactionUser();
  const [{ isSuperAdmin, canDeleteAnyArticle }, siteSettings] = await Promise.all([
    getEditorProfile(user),
    getEditorSiteSettings(),
  ]);

  return (
    <Suspense
      fallback={<p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>}
    >
      <RedactionArticlesList
        initialIsSuperAdmin={isSuperAdmin}
        initialCanDeleteAny={canDeleteAnyArticle}
        initialShowViews={siteSettings.showArticleViewCounts !== false}
      />
    </Suspense>
  );
}
