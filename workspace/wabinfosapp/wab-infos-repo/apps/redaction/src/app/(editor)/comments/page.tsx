'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Loader2, X } from 'lucide-react';
import { formatArticleDate } from '@/lib/utils';
import type { RedactionComment } from '@/lib/redaction/types';
import { cn } from '@/lib/utils';

type Filter = 'pending' | 'approved' | 'rejected';

export default function RedactionCommentsPage() {
  const [filter, setFilter] = useState<Filter>('pending');
  const [comments, setComments] = useState<RedactionComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch(`/api/redaction/comments?status=${filter}`)
      .then((r) => r.json())
      .then((d: { comments?: RedactionComment[] }) => setComments(d.comments ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function moderate(documentId: string, status: 'approved' | 'rejected') {
    setActing(documentId);
    try {
      const res = await fetch('/api/redaction/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, status }),
      });
      if (res.ok) {
        setComments((list) => list.filter((c) => c.documentId !== documentId));
      }
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Commentaires</h1>
        <p className="mt-1 text-sm text-muted-foreground">Modération mobile</p>
      </div>

      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {f === 'pending' ? 'En attente' : f === 'approved' ? 'Approuvés' : 'Refusés'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
      ) : comments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Aucun commentaire
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.documentId} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{comment.authorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatArticleDate(comment.createdAt)}
                  </p>
                </div>
                {comment.article && (
                  <Link
                    href={`/${comment.article.category?.slug ?? 'actualite'}/${comment.article.slug}`}
                    className="shrink-0 text-xs font-medium text-primary line-clamp-2 max-w-[40%] text-right"
                  >
                    {comment.article.title}
                  </Link>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed">{comment.content}</p>

              {filter === 'pending' && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={acting === comment.documentId}
                    onClick={() => moderate(comment.documentId, 'rejected')}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-lg border border-border text-sm font-semibold text-muted-foreground disabled:opacity-60"
                  >
                    {acting === comment.documentId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="h-4 w-4" /> Refuser
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={acting === comment.documentId}
                    onClick={() => moderate(comment.documentId, 'approved')}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {acting === comment.documentId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4" /> Approuver
                      </>
                    )}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
