'use client';

import { useRouter } from 'next/navigation';
import { ArticleEditorForm, type ArticleEditorValues } from '@/components/redaction/article-editor-form';

interface EditArticleClientProps {
  documentId: string;
  initial: Partial<ArticleEditorValues>;
}

export function EditArticleClient({ documentId, initial }: EditArticleClientProps) {
  const router = useRouter();

  return (
    <ArticleEditorForm
      documentId={documentId}
      initial={initial}
      onSuccess={() => router.refresh()}
    />
  );
}
