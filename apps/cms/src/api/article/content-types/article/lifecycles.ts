export default {
  async afterCreate(event: {
    result: {
      slug?: string;
      status?: string;
      newsletterSentAt?: string | null;
      publishedAt?: string;
      wpPublishedAt?: string | null;
      documentId?: string;
    };
  }) {
    await triggerRevalidation('article', event.result);
    await triggerNewsletter(event.result);
  },
  async afterUpdate(event: {
    result: {
      slug?: string;
      status?: string;
      newsletterSentAt?: string | null;
      publishedAt?: string;
      wpPublishedAt?: string | null;
      documentId?: string;
    };
  }) {
    await triggerRevalidation('article', event.result);
    await triggerNewsletter(event.result);
  },
  async afterDelete() {
    await triggerRevalidation('article');
  },
};

async function triggerRevalidation(
  type: string,
  result?: { slug?: string; category?: { slug?: string } }
) {
  const secret = process.env.REVALIDATION_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  if (!secret) return;

  try {
    await fetch(`${siteUrl}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidation-secret': secret,
      },
      body: JSON.stringify({
        type,
        slug: result?.slug,
        category: result?.category?.slug,
        path: '/',
      }),
    });
  } catch (err) {
    console.error('Revalidation failed:', err);
  }
}

async function triggerNewsletter(result: {
  slug?: string;
  status?: string;
  newsletterSentAt?: string | null;
  publishedAt?: string;
  wpPublishedAt?: string | null;
}) {
  if (process.env.NEWSLETTER_SEND_ON_PUBLISH !== 'true') return;
  if (!result.slug || result.status !== 'published' || result.newsletterSentAt) return;

  // Évite l'envoi massif lors d'imports d'anciens articles (toute année)
  const effectiveDate = result.wpPublishedAt || result.publishedAt;
  if (effectiveDate) {
    const publishedMs = new Date(effectiveDate).getTime();
    const maxAgeMs = 48 * 60 * 60 * 1000;
    if (Date.now() - publishedMs > maxAgeMs) return;
  }

  const secret = process.env.NEWSLETTER_SECRET || process.env.REVALIDATION_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  if (!secret) return;

  try {
    const response = await fetch(`${siteUrl}/api/newsletter/send-article`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-newsletter-secret': secret,
      },
      body: JSON.stringify({ slug: result.slug }),
    });

    if (!response.ok) {
      console.error('[newsletter] send-article failed:', response.status, await response.text());
    }
  } catch (err) {
    console.error('[newsletter] trigger failed:', err);
  }
}
