/** Invalide le cache Next.js du site public (ISR). */

export async function triggerSiteArticleRevalidation(input: {
  slug?: string | null;
  categorySlug?: string | null;
}): Promise<void> {
  const secret = process.env.REVALIDATION_SECRET?.trim();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wab-infos.com').replace(
    /\/$/,
    ''
  );
  if (!secret) {
    console.warn('[revalidation] REVALIDATION_SECRET manquant — cache site non invalidé');
    return;
  }

  try {
    const res = await fetch(`${siteUrl}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidation-secret': secret,
      },
      body: JSON.stringify({
        type: 'article',
        slug: input.slug || undefined,
        category: input.categorySlug || undefined,
        path: '/',
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[revalidation] échec', res.status, text.slice(0, 200));
    }
  } catch (err) {
    console.error('[revalidation] erreur réseau', err);
  }
}
