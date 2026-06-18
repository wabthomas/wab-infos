export default {
  async afterCreate(event: { result: { slug?: string; category?: { slug?: string } } }) {
    await triggerRevalidation('article', event.result);
  },
  async afterUpdate(event: { result: { slug?: string; category?: { slug?: string } } }) {
    await triggerRevalidation('article', event.result);
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
