import qs from 'qs';

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:8090';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

export async function strapiAdminFetch<T>(
  path: string,
  params?: Record<string, unknown>,
  options?: RequestInit
): Promise<T> {
  if (!STRAPI_TOKEN) throw new Error('STRAPI_API_TOKEN manquant');

  const query = params ? `?${qs.stringify(params, { encodeValuesOnly: true })}` : '';
  const url = `${STRAPI_URL}/api${path}${query}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${STRAPI_TOKEN}`,
        ...options?.headers,
      },
      cache: 'no-store',
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'erreur réseau';
    throw new Error(
      `CMS inaccessible (${STRAPI_URL}). Vérifiez STRAPI_URL et que Strapi est démarré. (${detail})`
    );
  }

  if (!res.ok) {
    const text = await res.text();
    const snippet = text.slice(0, 200);
    if (res.status === 404) {
      throw new Error(
        `Strapi 404: ${snippet}. Vérifiez que le CMS est à jour (type « Abonnement push lecteurs ») et que le token API a les droits reader-push-subscription.`
      );
    }
    throw new Error(`Strapi ${res.status}: ${snippet}`);
  }

  return res.json() as Promise<T>;
}
