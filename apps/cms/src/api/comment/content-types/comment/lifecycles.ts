export default {
  async afterCreate(event: {
    result: {
      status?: string;
      authorName?: string;
      content?: string;
      article?: { title?: string };
    };
  }) {
    if (event.result.status !== 'pending') return;
    await notifyEditors({
      title: 'Nouveau commentaire',
      body: `${event.result.authorName ?? 'Lecteur'} — ${(event.result.content ?? '').slice(0, 80)}`,
      url: '/comments',
    });
  },
};

async function notifyEditors(payload: { title: string; body: string; url: string }) {
  const secret = process.env.REVALIDATION_SECRET;
  const redactionUrl = (
    process.env.REDACTION_APP_URL ||
    process.env.NEXT_PUBLIC_REDACTION_URL ||
    'http://localhost:3001'
  ).replace(/\/$/, '');
  if (!secret) return;

  try {
    await fetch(`${redactionUrl}/api/redaction/push/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidation-secret': secret,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[push] comment notify failed:', err);
  }
}
