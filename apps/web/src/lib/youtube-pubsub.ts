import { siteConfig } from '@/config/site';

const HUB_URL = 'https://pubsubhubbub.appspot.com/subscribe';

/**
 * Renouvelle l’abonnement WebSub YouTube → /api/webhooks/youtube
 * (lease ~10 jours). Appelé depuis le cron publish-scheduled.
 */
export async function renewYoutubePubSubSubscription(): Promise<{
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  status?: number;
}> {
  const channelId = siteConfig.youtubeChannelId;
  if (!channelId) {
    return { ok: true, skipped: true, reason: 'no_youtube_channel' };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wab-infos.com').replace(/\/$/, '');
  const callback = `${siteUrl}/api/webhooks/youtube`;
  const topic = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`;

  try {
    const body = new URLSearchParams({
      'hub.callback': callback,
      'hub.topic': topic,
      'hub.mode': 'subscribe',
      'hub.verify': 'async',
      'hub.lease_seconds': '864000',
    });

    const response = await fetch(HUB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    });

    // Hub répond 202 (async) ou 204
    if (response.status === 202 || response.status === 204 || response.ok) {
      return { ok: true, status: response.status };
    }

    return {
      ok: false,
      status: response.status,
      reason: (await response.text().catch(() => '')).slice(0, 200),
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'subscribe_failed',
    };
  }
}
