import { ArticleSidebar } from '@/components/articles/article-sidebar';
import { RelatedArticles } from '@/components/articles/related-articles';
import { ArticleCommentForm } from '@/components/comments/article-comment-form';
import { ArticleCommentsList } from '@/components/comments/article-comments-list';
import { getApprovedComments, getRelatedArticles } from '@/lib/strapi';
import { getLiveFeed } from '@/lib/sidebar-data';

interface ArticleSidebarAsyncProps {
  slug: string;
  categorySlug: string;
  categoryName: string;
  categoryColor: string;
}

export async function ArticleSidebarAsync({
  slug,
  categorySlug,
  categoryName,
  categoryColor,
}: ArticleSidebarAsyncProps) {
  const [related, liveFeed] = await Promise.all([
    getRelatedArticles(slug, categorySlug, 4),
    getLiveFeed(8),
  ]);

  return (
    <ArticleSidebar
      related={related}
      liveFeed={liveFeed.filter((item) => item.slug !== slug)}
      categoryName={categoryName}
      categorySlug={categorySlug}
      categoryColor={categoryColor}
      excludeArticleSlugs={[slug]}
    />
  );
}

interface ArticleRelatedAsyncProps {
  slug: string;
  categorySlug: string;
  categoryName: string;
}

export async function ArticleRelatedAsync({
  slug,
  categorySlug,
  categoryName,
}: ArticleRelatedAsyncProps) {
  const related = await getRelatedArticles(slug, categorySlug, 4);

  return (
    <RelatedArticles
      articles={related}
      categoryName={categoryName}
      categorySlug={categorySlug}
    />
  );
}

interface ArticleCommentsAsyncProps {
  documentId: string;
}

export async function ArticleCommentsAsync({ documentId }: ArticleCommentsAsyncProps) {
  const comments = await getApprovedComments(documentId);

  return (
    <>
      <ArticleCommentsList comments={comments} />
      <ArticleCommentForm articleDocumentId={documentId} />
    </>
  );
}

export function ArticleSidebarSkeleton() {
  return (
    <aside className="space-y-6" aria-hidden>
      <div className="h-64 animate-pulse rounded-xl bg-muted/50" />
      <div className="h-48 animate-pulse rounded-xl bg-muted/40" />
      <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
    </aside>
  );
}

export function ArticleRelatedSkeleton() {
  return (
    <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-2" aria-hidden>
      <div className="h-48 animate-pulse rounded-xl bg-muted/40" />
      <div className="h-48 animate-pulse rounded-xl bg-muted/40" />
    </div>
  );
}

export function ArticleCommentsSkeleton() {
  return (
    <div className="mt-10 space-y-4" aria-hidden>
      <div className="h-8 w-40 animate-pulse rounded bg-muted/50" />
      <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
    </div>
  );
}
