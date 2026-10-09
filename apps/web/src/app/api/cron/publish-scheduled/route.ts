import { NextResponse } from 'next/server';
import { publishDueScheduledArticles } from '@/lib/strapi-server';
import { publishNewYoutubeVideoNewsletters } from '@/lib/newsletter/send-youtube-videos';
import { publishNewYoutubeVideoPushes } from '@/lib/push/publish-youtube-videos';
import { sendReaderDailyEngagementIfDue } from '@/lib/push/broadcast';
import { triggerNewsIngestIfIdle } from '@/lib/news-ingest/run';

export async function POST(request: Request) {
  const secret = request.headers.get('x-revalidation-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    triggerNewsIngestIfIdle();

    const [articles, youtube, newsletterVideos, engagement] = await Promise.all([
      publishDueScheduledArticles(),
      publishNewYoutubeVideoPushes(),
      publishNewYoutubeVideoNewsletters(),
      sendReaderDailyEngagementIfDue(),
    ]);
    return NextResponse.json({ ok: true, ...articles, youtube, newsletterVideos, engagement });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
