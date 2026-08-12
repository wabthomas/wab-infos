'use client';

import { useRouter } from 'next/navigation';
import { ArticleEditorForm } from '@/components/redaction/article-editor-form';

interface NouveauArticleClientProps {
  defaultEmptyContent: string;
}

export function NouveauArticleClient({ defaultEmptyContent }: NouveauArticleClientProps) {
  const router = useRouter();

  return (
    <ArticleEditorForm
      defaultEmptyContent={defaultEmptyContent}
      initial={{ content: defaultEmptyContent }}
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
