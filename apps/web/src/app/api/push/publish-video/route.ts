import { NextRequest, NextResponse } from 'next/server';
import { pushConfig } from '@/lib/push/config';
import { publishNewYoutubeVideoPushes } from '@/lib/push/publish-youtube-videos';

/**
 * Déclenche les push pour les nouvelles vidéos YouTube (même logique que le cron).
 * Body optionnel : { "videoId": "..." } — ignoré pour l’instant (scan flux frais).
 */
export async function POST(request: NextRequest) {
  const secret =
    request.headers.get('x-push-secret') ||
    request.headers.get('x-revalidation-secret');

  if (!secret || secret !== pushConfig.secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await request.json().catch(() => ({}));
    const result = await publishNewYoutubeVideoPushes();

    if (!result.ok && !result.skipped) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[push/publish-video]', error);
    return NextResponse.json({ error: 'Push failed' }, { status: 500 });
  }
}
