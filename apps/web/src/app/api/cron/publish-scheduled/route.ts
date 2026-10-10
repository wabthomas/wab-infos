import { NextResponse } from 'next/server';
import { publishDueScheduledArticles } from '@/lib/strapi-server';
import { publishNewYoutubeVideoNewsletters } from '@/lib/newsletter/send-youtube-videos';
import { publishNewYoutubeVideoPushes } from '@/lib/push/publish-youtube-videos';
import { sendReaderDailyEngagementIfDue } from '@/lib/push/broadcast';
import { triggerNewsIngestIfIdle } from '@/lib/news-ingest/run';
import { triggerAiImportProcessingIfIdle } from '@/lib/ai/trigger-redaction-ai';
import { renewYoutubePubSubSubscription } from '@/lib/youtube-pubsub';

export async function POST(request: Request) {
  const secret = request.headers.get('x-revalidation-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    triggerNewsIngestIfIdle();
    triggerAiImportProcessingIfIdle();

    const [articles, youtube, newsletterVideos, engagement, youtubeHub] = await Promise.all([
      publishDueScheduledArticles(),
      publishNewYoutubeVideoPushes(),
      publishNewYoutubeVideoNewsletters(),
      sendReaderDailyEngagementIfDue(),
      renewYoutubePubSubSubscription(),
    ]);
    return NextResponse.json({
      ok: true,
      ...articles,
      youtube,
      newsletterVideos,
      engagement,
      youtubeHub,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
