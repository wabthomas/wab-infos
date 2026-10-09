import { strapiAdminFetch } from '@/lib/push/strapi-admin';

interface YoutubeLogRow {
  documentId?: string;
  youtubeId: string;
}

function logKey(youtubeId: string): string {
  return `nl:${youtubeId}`;
}

/** Réserve l'envoi. Retourne l'id du journal, ou null si la vidéo a déjà été traitée. */
export async function claimYoutubeNewsletterSend(
  youtubeId: string,
  title: string
): Promise<string | null> {
  const key = logKey(youtubeId);

  try {
    const existing = await strapiAdminFetch<{ data: YoutubeLogRow[] }>('/youtube-push-logs', {
      filters: { youtubeId: { $eq: key } },
      pagination: { pageSize: 1 },
    });
    if (existing.data[0]) return null;

    const created = await strapiAdminFetch<{ data: YoutubeLogRow }>('/youtube-push-logs', undefined, {
      method: 'POST',
      body: JSON.stringify({
        data: {
          youtubeId: key,
          title: title.slice(0, 300),
          sentAt: new Date().toISOString(),
        },
      }),
    });

    return created.data?.documentId || 'claimed';
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('400') || /unique/i.test(message)) return null;
    console.error('[newsletter/youtube] claim failed', youtubeId, error);
    return null;
  }
}

export async function releaseYoutubeNewsletterClaim(documentId: string): Promise<void> {
  if (!documentId || documentId === 'claimed') return;
  try {
    await strapiAdminFetch(`/youtube-push-logs/${documentId}`, undefined, { method: 'DELETE' });
  } catch (error) {
    console.error('[newsletter/youtube] release failed', documentId, error);
  }
}
