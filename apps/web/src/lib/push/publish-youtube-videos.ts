import { getVideoPagePath, siteConfig } from '@/config/site';
import { isRecentPublication } from '@/lib/article-publish';
import { isFirebaseAdminConfigured } from '@/lib/firebase/config';
import { pushConfig } from '@/lib/push/config';
import { sendPushToReaders } from '@/lib/push/send';
import { hasYoutubePushBeenSent, markYoutubePushSent } from '@/lib/push/youtube-push-log';
import { listReaderPushSubscriptions } from '@/lib/push/subscriptions';
import { getChannelRecentVideos } from '@/lib/youtube-channel';

export interface PublishYoutubeVideosPushResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  processed?: {
    youtubeId: string;
    title: string;
    sent: number;
    failed: number;
    skipped?: boolean;
    reason?: string;
  }[];
}

export async function publishNewYoutubeVideoPushes(): Promise<PublishYoutubeVideosPushResult> {
  if (!pushConfig.enabled || !pushConfig.sendOnYoutubeVideo) {
    return { ok: true, skipped: true, reason: 'push_disabled' };
  }

  const channelId = siteConfig.youtubeChannelId;
  if (!channelId) {
    return { ok: true, skipped: true, reason: 'no_youtube_channel' };
  }

  if (!isFirebaseAdminConfigured()) {
    return { ok: false, skipped: true, reason: 'firebase_not_configured' };
  }

  const subscriptions = await listReaderPushSubscriptions();
  if (!subscriptions.length) {
    return { ok: true, skipped: true, reason: 'no_subscribers' };
  }

  const recent = await getChannelRecentVideos(channelId, 8);
  const processed: NonNullable<PublishYoutubeVideosPushResult['processed']> = [];

  for (const video of recent) {
    if (!isRecentPublication(video.publishedAt)) {
      processed.push({
        youtubeId: video.videoId,
        title: video.title,
        sent: 0,
        failed: 0,
        skipped: true,
        reason: 'too_old',
      });
      continue;
    }

    if (await hasYoutubePushBeenSent(video.videoId)) {
      processed.push({
        youtubeId: video.videoId,
        title: video.title,
        sent: 0,
        failed: 0,
        skipped: true,
        reason: 'already_sent',
      });
      continue;
    }

    const url = `${pushConfig.siteUrl}${getVideoPagePath(video.videoId)}`;
    const { sent, failed } = await sendPushToReaders({
      title: 'Nouvelle vidéo — Wab-infos TV',
      body: video.title,
      url,
    });

    if (sent > 0) {
      try {
        await markYoutubePushSent(video.videoId, video.title);
      } catch (error) {
        console.error('[push/youtube] markYoutubePushSent failed:', video.videoId, error);
      }
    }

    processed.push({
      youtubeId: video.videoId,
      title: video.title,
      sent,
      failed,
    });
  }

  const anyFailed = processed.some((row) => row.failed > 0 && !row.skipped);
  return { ok: !anyFailed, processed };
}
