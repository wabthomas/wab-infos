import { notFound } from 'next/navigation';
import { getEditorArticle, requireRedactionUser } from '@/lib/redaction/strapi-editor';
import { EditArticleClient } from '@/components/redaction/edit-article-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RedactionEditArticlePage({ params }: PageProps) {
  const user = await requireRedactionUser();
  const { id } = await params;
  const article = await getEditorArticle(user, id);

  if (!article) notFound();

  return (
    <EditArticleClient
      documentId={article.documentId}
      initial={{
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        categoryDocumentId: article.category?.documentId ?? '',
        featuredImageId: article.featuredImage?.id,
        featuredImageUrl: article.featuredImage?.url,
        isBreaking: article.isBreaking,
        scheduledAt: article.scheduledAt,
      }}
    />
  );
}
