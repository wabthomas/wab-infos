/**
 * Déclenche l'envoi push lecteur via l'API web (fallback si le lifecycle Strapi CMS échoue).
 */
export async function triggerReaderPushOnPublish(slug: string): Promise<void> {
  if (process.env.PUSH_SEND_ON_PUBLISH !== 'true') return;

  const secret = process.env.PUSH_SECRET || process.env.REVALIDATION_SECRET;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wab-infos.com').replace(/\/$/, '');
  const normalizedSlug = slug.trim();

  if (!secret || !normalizedSlug) return;

  try {
    const response = await fetch(`${siteUrl}/api/push/publish-article`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-push-secret': secret,
      },
      body: JSON.stringify({ slug: normalizedSlug }),
    });

    if (!response.ok) {
      console.warn('[push/trigger]', response.status, await response.text());
    }
  } catch (error) {
    console.warn('[push/trigger]', error);
  }
}
