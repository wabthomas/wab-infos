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
    if (isPublishedArticle(event.result)) {
      runArticlePublishSideEffects(event.result);
    }
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
    if (isPublishedArticle(event.result)) {
      runArticlePublishSideEffects(event.result);
    }
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

const GENERIC_SLUGS = new Set(['article', 'articles', 'post', 'nouveau', 'brouillon', 'sans-titre']);

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

/** Ne pas bloquer la réponse Strapi (newsletter, push, etc. peuvent être lents). */
function runArticlePublishSideEffects(result: {
  slug?: string;
  status?: string;
  newsletterSentAt?: string | null;
  facebookPostedAt?: string | null;
  xPostedAt?: string | null;
  pushSentAt?: string | null;
  publishedAt?: string | null;
  wpPublishedAt?: string | null;
  documentId?: string;
  category?: { slug?: string };
}) {
  void triggerRevalidation('article', result).catch((err) => {
    console.error('[article] revalidation failed:', err);
  });
  void triggerNewsletter(result).catch((err) => {
    console.error('[article] newsletter trigger failed:', err);
  });
  void triggerSocialPublish(result).catch((err) => {
    console.error('[article] social trigger failed:', err);
  });
  void triggerPushPublish(result).catch((err) => {
    console.error('[article] push trigger failed:', err);
  });
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
  if (!result.publishedAt) return false;
  if (result.status === 'archived' || result.status === 'draft' || result.status === 'scheduled') {
    return false;
  }
  return result.status === 'published';
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

    let data: { skipped?: boolean; reason?: string; sent?: number } | null = null;
    try {
      data = JSON.parse(body) as { skipped?: boolean; reason?: string; sent?: number };
    } catch {
      // réponse non-JSON
    }

    if (data?.skipped) {
      console.warn('[newsletter] send-article skipped:', data.reason ?? 'unknown');
      return;
    }

    if (!response.ok) {
      console.error('[newsletter] send-article failed:', response.status, body);
      return;
    }

    if (data?.sent) {
      console.log(`[newsletter] sent to ${data.sent} subscriber(s) for ${result.slug}`);
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
  publishedAt?: string | null;
  wpPublishedAt?: string | null;
}) {
  if (process.env.SOCIAL_SEND_ON_PUBLISH !== 'true') return;
  if (!result.slug || !isPublishedArticle(result)) return;
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
