import qs from 'qs';

function getStrapiUrl(): string {
  return process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:8090';
}

function apiHeaders(): HeadersInit {
  const token = process.env.STRAPI_API_TOKEN;
  if (!token) throw new Error('STRAPI_API_TOKEN manquant');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function strapiFetch<T>(
  path: string,
  params?: Record<string, unknown>,
  options?: RequestInit
): Promise<T> {
  const query = params ? `?${qs.stringify(params, { encodeValuesOnly: true })}` : '';
  const res = await fetch(`${getStrapiUrl()}/api${path}${query}`, {
    ...options,
    headers: { ...apiHeaders(), ...options?.headers },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strapi ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

interface StrapiEntity {
  documentId: string;
}

export async function publishDueScheduledArticles(): Promise<{
  published: number;
  documentIds: string[];
}> {
  const now = new Date().toISOString();
  const response = await strapiFetch<{ data: StrapiEntity[] }>('/articles', {
    filters: {
      status: { $eq: 'scheduled' },
      scheduledAt: { $lte: now },
    },
    pagination: { pageSize: 50 },
    status: 'draft',
  });

  const documentIds: string[] = [];

  for (const article of response.data) {
    await strapiFetch(`/articles/${article.documentId}?status=published`, undefined, {
      method: 'PUT',
      body: JSON.stringify({
        data: {
          status: 'published',
          scheduledAt: null,
        },
      }),
    });
    documentIds.push(article.documentId);
  }

  return { published: documentIds.length, documentIds };
}

export async function createPublicComment(payload: {
  content: string;
  authorName: string;
  authorEmail: string;
  articleDocumentId: string;
}): Promise<void> {
  await strapiFetch('/comments', undefined, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        content: payload.content.trim().slice(0, 2000),
        authorName: payload.authorName.trim().slice(0, 100),
        authorEmail: payload.authorEmail.trim().toLowerCase(),
        status: 'pending',
        article: payload.articleDocumentId,
      },
    }),
  });
}
