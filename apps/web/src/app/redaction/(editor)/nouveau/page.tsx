'use client';

import { useRouter } from 'next/navigation';
import { ArticleEditorForm } from '@/components/redaction/article-editor-form';

export default function RedactionNewArticlePage() {
  const router = useRouter();

  return (
    <ArticleEditorForm
      onSuccess={(id) => {
        router.push(`/redaction/articles/${id}/edit`);
        router.refresh();
      }}
    />
  );
}
