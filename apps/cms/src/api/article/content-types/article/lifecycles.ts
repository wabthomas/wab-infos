export default {
  async beforeCreate(event: { params: { data: Record<string, unknown> } }) {
    ensureArticleSlug(event.params.data, false);
  },
  async beforeUpdate(event: { params: { data: Record<string, unknown> } }) {
    ensureArticleSlug(event.params.data, true);
  },
  async afterCreate(event: {
    result: {
      slug?: string;
      status?: string;
      newsletterSentAt?: string | null;
      facebookPostedAt?: string | null;
      xPostedAt?: string | null;
      pushSentAt?: string | null;
      publishedAt?: string | null;
      wpPublishedAt?: string | null;
      documentId?: string;
    };
  }) {
    await triggerRevalidation('article', event.result);
    await triggerNewsletter(event.result);
    await triggerSocialPublish(event.result);
    await triggerPushPublish(event.result);
  },
  async afterUpdate(event: {
    result: {
      slug?: string;
      status?: string;
      newsletterSentAt?: string | null;
      facebookPostedAt?: string | null;
      xPostedAt?: string | null;
      pushSentAt?: string | null;
      publishedAt?: string | null;
      wpPublishedAt?: string | null;
      documentId?: string;
    };
  }) {
    await triggerRevalidation('article', event.result);
    await triggerNewsletter(event.result);
    await triggerSocialPublish(event.result);
    await triggerPushPublish(event.result);
  },
  async afterDelete() {
    await triggerRevalidation('article');
  },
};

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

const GENERIC_SLUGS = new Set(['article', 'articles', 'post', 'nouveau', 'brouillon']);

function ensureArticleSlug(data: Record<string, unknown>, isUpdate: boolean) {
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (!title) return;

  // Mise à jour partielle (ex. publication) : ne pas régénérer le slug existant
  if (isUpdate && !('slug' in data)) return;

  const slug = typeof data.slug === 'string' ? data.slug.trim().toLowerCase() : '';
  if (slug && !GENERIC_SLUGS.has(slug)) return;

  const base = slugifyTitle(title);
  data.slug = base || `article-${Date.now().toString(36)}`;
}

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

function isPublishedArticle(result: {
  status?: string;
  publishedAt?: string | null;
}): boolean {
  if (result.status === 'archived') return false;
  if (result.status === 'published') return true;
  return Boolean(result.publishedAt);
}

async function triggerNewsletter(result: {
  slug?: string;
  status?: string;
  newsletterSentAt?: string | null;
  publishedAt?: string | null;
  wpPublishedAt?: string | null;
}) {
  if (process.env.NEWSLETTER_SEND_ON_PUBLISH !== 'true') return;
  if (!result.slug || !isPublishedArticle(result) || result.newsletterSentAt) return;

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

    const body = await response.text();

    if (!response.ok) {
      console.error('[newsletter] send-article failed:', response.status, body);
      return;
    }

    try {
      const data = JSON.parse(body) as { skipped?: boolean; reason?: string; sent?: number };
      if (data.skipped) {
        console.warn('[newsletter] send-article skipped:', data.reason ?? 'unknown');
      } else if (data.sent) {
        console.log(`[newsletter] sent to ${data.sent} subscriber(s) for ${result.slug}`);
      }
    } catch {
      // réponse non-JSON
    }
  } catch (err) {
    console.error('[newsletter] trigger failed:', err);
  }
}

async function triggerSocialPublish(result: {
  slug?: string;
  status?: string;
  facebookPostedAt?: string | null;
  xPostedAt?: string | null;
  publishedAt?: string;
  wpPublishedAt?: string | null;
}) {
  if (process.env.SOCIAL_SEND_ON_PUBLISH !== 'true') return;
  if (!result.slug || result.status !== 'published') return;
  if (result.facebookPostedAt && result.xPostedAt) return;

  const effectiveDate = result.wpPublishedAt || result.publishedAt;
  if (effectiveDate) {
    const publishedMs = new Date(effectiveDate).getTime();
    const maxAgeMs = 48 * 60 * 60 * 1000;
    if (Date.now() - publishedMs > maxAgeMs) return;
  }

  const secret = process.env.SOCIAL_SECRET || process.env.REVALIDATION_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  if (!secret) return;

  try {
    const response = await fetch(`${siteUrl}/api/social/publish-article`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-social-secret': secret,
      },
      body: JSON.stringify({ slug: result.slug }),
    });

    if (!response.ok) {
      console.error('[social] publish-article failed:', response.status, await response.text());
    }
  } catch (err) {
    console.error('[social] trigger failed:', err);
  }
}

async function triggerPushPublish(result: {
  slug?: string;
  status?: string;
  pushSentAt?: string | null;
  publishedAt?: string | null;
  wpPublishedAt?: string | null;
}) {
  if (process.env.PUSH_SEND_ON_PUBLISH !== 'true') return;
  if (!result.slug || !isPublishedArticle(result) || result.pushSentAt) return;

  const effectiveDate = result.wpPublishedAt || result.publishedAt;
  if (effectiveDate) {
    const publishedMs = new Date(effectiveDate).getTime();
    const maxAgeMs = 48 * 60 * 60 * 1000;
    if (Date.now() - publishedMs > maxAgeMs) return;
  }

  const secret = process.env.PUSH_SECRET || process.env.REVALIDATION_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  if (!secret) return;

  try {
    const response = await fetch(`${siteUrl}/api/push/publish-article`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-push-secret': secret,
      },
      body: JSON.stringify({ slug: result.slug }),
    });

    if (!response.ok) {
      console.error('[push] publish-article failed:', response.status, await response.text());
    }
  } catch (err) {
    console.error('[push] trigger failed:', err);
  }
}
