import { strapiAdminFetch } from '@/lib/push/strapi-admin';

interface YoutubePushLogRow {
  documentId: string;
  youtubeId: string;
  title?: string;
  sentAt?: string;
}

interface YoutubePushLogListResponse {
  data: YoutubePushLogRow[];
  meta?: { pagination?: { pageCount?: number } };
}

export async function hasYoutubePushBeenSent(youtubeId: string): Promise<boolean> {
  try {
    const response = await strapiAdminFetch<YoutubePushLogListResponse>('/youtube-push-logs', {
      filters: { youtubeId: { $eq: youtubeId } },
      pagination: { pageSize: 1 },
    });
    return Boolean(response.data[0]);
  } catch {
    return false;
  }
}

export async function markYoutubePushSent(youtubeId: string, title: string): Promise<void> {
  await strapiAdminFetch('/youtube-push-logs', undefined, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        youtubeId,
        title: title.slice(0, 300),
        sentAt: new Date().toISOString(),
      },
    }),
  });
}
