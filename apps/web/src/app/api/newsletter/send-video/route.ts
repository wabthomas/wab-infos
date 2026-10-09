import { NextRequest, NextResponse } from 'next/server';
import { newsletterConfig } from '@/lib/newsletter/config';
import {
  publishNewYoutubeVideoNewsletters,
  sendLatestYoutubeVideoNewsletter,
} from '@/lib/newsletter/send-youtube-videos';

export async function POST(request: NextRequest) {
  const secret =
    request.headers.get('x-newsletter-secret') ||
    request.headers.get('x-revalidation-secret');

  if (!secret || secret !== newsletterConfig.secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { videoId?: string };
    const videoId = body.videoId?.trim();
    const result = videoId
      ? await publishNewYoutubeVideoNewsletters(videoId)
      : await sendLatestYoutubeVideoNewsletter();

    if (!result.ok && !result.skipped) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[newsletter/send-video]', error);
    return NextResponse.json({ error: 'Send failed' }, { status: 500 });
  }
}
