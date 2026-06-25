import type { RedactionArticle } from '@/lib/redaction/types';

const STATUS_LABELS: Record<RedactionArticle['status'], string> = {
  published: 'Publié',
  scheduled: 'Planifié',
  draft: 'Brouillon',
  archived: 'Archivé',
};

export function getRedactionArticleStatusLabel(status: RedactionArticle['status']): string {
  return STATUS_LABELS[status];
}
