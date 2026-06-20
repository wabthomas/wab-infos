'use client';

import { useRouter } from 'next/navigation';
import { ArticleEditorForm } from '@/components/redaction/article-editor-form';

export default function RedactionNewArticlePage() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Nouvel article</h1>
      <ArticleEditorForm
        onSuccess={(id) => {
          router.push(`/redaction/articles/${id}/edit`);
          router.refresh();
        }}
      />
    </div>
  );
}
