'use client';

import { useRouter } from 'next/navigation';
import { ArticleEditorForm } from '@/components/redaction/article-editor-form';

export default function RedactionNewArticlePage() {
  const router = useRouter();

  return (
    <ArticleEditorForm
      onSuccess={(id, mode) => {
        if (mode === 'publish' || mode === 'schedule') {
          router.push('/articles');
        } else {
          router.push(`/articles/${id}/edit`);
        }
        router.refresh();
      }}
    />
  );
}
