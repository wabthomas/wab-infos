import { NextResponse } from 'next/server';
import { publishDueScheduledArticles } from '@/lib/strapi-server';
import { publishNewYoutubeVideoPushes } from '@/lib/push/publish-youtube-videos';

export async function POST(request: Request) {
  const secret = request.headers.get('x-revalidation-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [articles, youtube] = await Promise.all([
      publishDueScheduledArticles(),
      publishNewYoutubeVideoPushes(),
    ]);
    return NextResponse.json({ ok: true, ...articles, youtube });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
