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
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Modifier l&apos;article</h1>
      <ArticleEditorForm
        documentId={documentId}
        initial={initial}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
