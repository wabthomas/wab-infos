import { NextRequest, NextResponse } from 'next/server';
import { publishNewYoutubeVideoNewsletters } from '@/lib/newsletter/send-youtube-videos';
import { publishNewYoutubeVideoPushes } from '@/lib/push/publish-youtube-videos';
import { siteConfig } from '@/config/site';

/**
 * YouTube PubSubHubbub (WebSub) :
 * - GET : vérification d’abonnement (hub.challenge)
 * - POST : notification Atom → push + newsletter comme pour un article
 *
 * Abonnement (une fois, ou renouveler ~tous les 5–10 j) :
 * POST https://pubsubhubbub.appspot.com/subscribe
 *   hub.callback=https://wab-infos.com/api/webhooks/youtube
 *   hub.topic=https://www.youtube.com/xml/feeds/videos.xml?channel_id=CHANNEL_ID
 *   hub.mode=subscribe
 *   hub.verify=async
 *   hub.lease_seconds=864000
 */

function extractVideoIdsFromAtom(xml: string): string[] {
  const ids = [...xml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)].map((m) => m[1]);
  return [...new Set(ids)];
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const topic = request.nextUrl.searchParams.get('hub.topic') || '';
  const challenge = request.nextUrl.searchParams.get('hub.challenge');
  const channelId = siteConfig.youtubeChannelId;

  const topicOk =
    !channelId ||
    topic.includes(channelId) ||
    topic.includes('feeds/videos.xml');

  if ((mode === 'subscribe' || mode === 'unsubscribe') && challenge && topicOk) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'Invalid verification' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const xml = await request.text();
    const videoIds = extractVideoIdsFromAtom(xml);

    // Même si le XML est vide / inattendu, rescanner le flux frais.
    const [push, newsletter] = await Promise.all([
      publishNewYoutubeVideoPushes(),
      videoIds[0]
        ? publishNewYoutubeVideoNewsletters(videoIds[0])
        : publishNewYoutubeVideoNewsletters(),
    ]);

    return NextResponse.json({ ok: true, videoIds, push, newsletter });
  } catch (error) {
    console.error('[webhooks/youtube]', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
