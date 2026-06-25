import { Suspense } from 'react';
import { RedactionArticlesList } from '@/components/redaction/redaction-articles-list';

export default function RedactionArticlesPage() {
  return (
    <Suspense
      fallback={<p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>}
    >
      <RedactionArticlesList />
    </Suspense>
  );
}
