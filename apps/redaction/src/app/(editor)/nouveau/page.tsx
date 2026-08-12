import { getEditorSiteSettings } from '@/lib/redaction/site-settings';
import { defaultArticleEmptyContent } from '@wab-infos/shared';
import { NouveauArticleClient } from '@/components/redaction/nouveau-article-client';

export default async function RedactionNewArticlePage() {
  const settings = await getEditorSiteSettings();
  const defaultEmptyContent = defaultArticleEmptyContent(settings.chrome.articleUi);

  return <NouveauArticleClient defaultEmptyContent={defaultEmptyContent} />;
}
