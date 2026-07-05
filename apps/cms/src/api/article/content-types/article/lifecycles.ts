export default {
  async beforeCreate(event: { params: { data: Record<string, unknown> } }) {
    ensureArticleSlug(event.params.data, false);
  },
  async beforeUpdate(event: {
    params: {
      data: Record<string, unknown>;
      documentId?: string;
      where?: { documentId?: string };
    };
    state?: Record<string, unknown>;
  }) {
    ensureArticleSlug(event.params.data, true);

    const documentId =
      event.params.documentId ?? event.params.where?.documentId;
    if (!documentId) {
      event.state = { ...event.state, wasPublished: false };
      return;
    }

    try {
      const existing = (await strapi.db.query('api::article.article').findOne({
        where: { documentId },
        select: ['status', 'publishedAt'],
      })) as { status?: string; publishedAt?: string | null } | null;

      event.state = {
        ...event.state,
        wasPublished:
          existing?.status === 'published' && Boolean(existing?.publishedAt),
      };
    } catch {
      event.state = { ...event.state, wasPublished: false };
    }
  },
  async afterCreate(event: {
    result: ArticleLifecycleResult;
  }) {
    if (isPublishedArticle(event.result)) {
      runArticlePublishSideEffects(event.result);
    }
  },
  async afterUpdate(event: {
    params: {
      data?: Record<string, unknown>;
      documentId?: string;
      where?: { documentId?: string };
    };
    state?: Record<string, unknown>;
    result: ArticleLifecycleResult;
  }) {
    const data = event.params?.data ?? {};

    if (isPublishedArticle(event.result)) {
      void triggerRevalidation('article', event.result).catch((err) => {
        console.error('[article] revalidation failed:', err);
      });
    }

    // Newsletter / réseaux / push : uniquement à la publication explicite,
    // pas à chaque modification d'un article déjà en ligne.
    if (!isPublishedArticle(event.result)) return;
    if (isSideEffectOnlyUpdate(data)) return;
    if (!isExplicitPublishUpdate(data, event.result, event.state)) return;

    runArticlePublishSideEffects(event.result, { skipRevalidation: true });
  },
  async afterDelete() {
    await triggerRevalidation('article');
  },
};

type ArticleLifecycleResult = {
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
};

const SIDE_EFFECT_ONLY_FIELDS = new Set([
  'facebookPostedAt',
  'xPostedAt',
  'newsletterSentAt',
  'pushSentAt',
]);

/** Mise à jour qui ne fait qu'enregistrer un envoi (évite les boucles lifecycle). */
function isSideEffectOnlyUpdate(data: Record<string, unknown>): boolean {
  const keys = Object.keys(data).filter((key) => key !== 'updatedAt');
  if (keys.length === 0) return false;
  return keys.every((key) => SIDE_EFFECT_ONLY_FIELDS.has(key));
}

/** Publication explicite (brouillon → publié, planifié → publié), pas une simple édition. */
function isExplicitPublishUpdate(
  data: Record<string, unknown>,
  result: ArticleLifecycleResult,
  state?: Record<string, unknown>
): boolean {
  if (data.status === 'published') return true;
  if (state?.wasPublished === false && isPublishedArticle(result)) return true;
  // Strapi peut publier via ?status=published sans repasser status dans data
  if ('publishedAt' in data && isPublishedArticle(result)) return true;
  return false;
}

function publicationTimestamp(
  publishedAt?: string | null,
  wpPublishedAt?: string | null
): number {
  const times = [publishedAt, wpPublishedAt]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((time) => !Number.isNaN(time));
  return times.length ? Math.max(...times) : 0;
}

function isRecentPublication(
  publishedAt?: string | null,
  wpPublishedAt?: string | null
): boolean {
  const publishedMs = publicationTimestamp(publishedAt, wpPublishedAt);
  if (!publishedMs) return false;
  const maxAgeMs = 48 * 60 * 60 * 1000;
  return Date.now() - publishedMs <= maxAgeMs;
}

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
function runArticlePublishSideEffects(
  result: ArticleLifecycleResult,
  options?: { skipRevalidation?: boolean }
) {
  if (!options?.skipRevalidation) {
    void triggerRevalidation('article', result).catch((err) => {
      console.error('[article] revalidation failed:', err);
    });
  }
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
  if (!isRecentPublication(result.publishedAt, result.wpPublishedAt)) return;

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

  const needsFacebook = !result.facebookPostedAt;
  const needsX = !result.xPostedAt;
  if (!needsFacebook && !needsX) return;
  if (!isRecentPublication(result.publishedAt, result.wpPublishedAt)) {
    console.warn('[social] skipped: article not recent enough', result.slug);
    return;
  }

  const secret = process.env.SOCIAL_SECRET || process.env.REVALIDATION_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  if (!secret) {
    console.error('[social] skipped: SOCIAL_SECRET / REVALIDATION_SECRET missing');
    return;
  }

  try {
    const response = await fetch(`${siteUrl}/api/social/publish-article`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-social-secret': secret,
      },
      body: JSON.stringify({ slug: result.slug }),
    });

    const body = await response.text();
    if (!response.ok) {
      console.error('[social] publish-article failed:', response.status, body);
      return;
    }

    try {
      const data = JSON.parse(body) as { skipped?: boolean; reason?: string; facebook?: { ok?: boolean; error?: string } };
      if (data.skipped) {
        console.warn('[social] publish-article skipped:', data.reason ?? 'unknown', result.slug);
      } else if (data.facebook && !data.facebook.ok) {
        console.error('[social] facebook error:', data.facebook.error, result.slug);
      }
    } catch {
      // réponse non-JSON
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
  if (!isRecentPublication(result.publishedAt, result.wpPublishedAt)) return;

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
