import { formatArticleDate } from '@/lib/utils';
import type { ArticleComment } from '@/lib/strapi';

interface ArticleCommentsListProps {
  comments: ArticleComment[];
}

export function ArticleCommentsList({ comments }: ArticleCommentsListProps) {
  if (comments.length === 0) return null;

  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="font-display text-xl font-bold">
        Commentaires ({comments.length})
      </h2>
      <ul className="mt-4 space-y-4">
        {comments.map((comment) => (
          <li key={comment.documentId} className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-semibold">{comment.authorName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatArticleDate(comment.createdAt)}
            </p>
            <p className="mt-2 text-sm leading-relaxed">{comment.content}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
