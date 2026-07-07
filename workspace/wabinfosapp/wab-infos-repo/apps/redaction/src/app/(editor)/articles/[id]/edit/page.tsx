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
        categoryDocumentIds: [
          article.category?.documentId,
          ...(article.secondaryCategories?.map((item) => item.documentId) ?? []),
        ].filter(Boolean) as string[],
        tagNames: article.tagNames ?? [],
        seoTitle: article.seoTitle,
        seoDescription: article.seoDescription,
        canonicalUrl: article.canonicalUrl,
        featuredImageId: article.featuredImage?.id,
        featuredImageUrl: article.featuredImage?.url,
        featuredImageAlt: article.featuredImage?.alternativeText,
        isBreaking: article.isBreaking,
        scheduledAt: article.scheduledAt,
        authorDocumentId: article.author?.documentId,
        publishedAt: article.publishedAt,
        articleStatus: article.status,
        viewCount: article.viewCount,
      }}
    />
  );
}
