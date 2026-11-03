import qs from 'qs';

const url = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:8090';

/** Unique CMS constraint serializes concurrent publish hooks across web instances.
 * Never delete a claim automatically: SMTP may accept a message before a timeout. */
export async function claimArticleNewsletterSend(documentId: string, slug: string): Promise<boolean> {
  const headers = {
    Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
  if (!process.env.STRAPI_API_TOKEN) throw new Error('STRAPI_API_TOKEN missing');
  const response = await fetch(`${url}/api/article-newsletter-logs`, {
    method: 'POST', headers, cache: 'no-store',
    body: JSON.stringify({ data: { articleDocumentId: documentId, articleSlug: slug, claimedAt: new Date().toISOString() } }),
  });
  if (response.ok) return true;

  // Only a verified duplicate claim is a skip. Never silently swallow a CMS error.
  const query = qs.stringify({ filters: { articleDocumentId: { $eq: documentId } }, pagination: { pageSize: 1 } });
  const existing = await fetch(`${url}/api/article-newsletter-logs?${query}`, { headers, cache: 'no-store' });
  if (!existing.ok) throw new Error(`Newsletter claim lookup failed: ${existing.status}`);
  const result = await existing.json() as { data?: unknown[] };
  if (result.data?.length) return false;
  throw new Error(`Newsletter claim failed: ${response.status} ${await response.text()}`);
}
