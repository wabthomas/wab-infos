import { getVideoPagePath, siteConfig } from '@/config/site';
import { isRecentPublication } from '@/lib/article-publish';
import { newsletterConfig } from '@/lib/newsletter/config';
import { isMailReady } from '@/lib/newsletter/stored-settings';
import { enqueueYoutubeNewsletter } from '@/lib/newsletter/queue';
import { buildUnsubscribeUrl, getActiveSubscribers } from '@/lib/newsletter/subscribers';
import {
  buildVideoNewsletterSubject,
  renderVideoNewsletterHtml,
  renderVideoNewsletterText,
  type VideoNewsletterData,
} from '@/lib/newsletter/video-template';
import {
  claimYoutubeNewsletterSend,
  releaseYoutubeNewsletterClaim,
} from '@/lib/newsletter/youtube-newsletter-log';
import {
  formatDisplayTitle,
  getChannelRecentVideosFresh,
  truncateVideoDescription,
} from '@/lib/youtube-channel';

export interface PublishYoutubeVideosNewsletterResult {
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

function videoExcerpt(description: string | undefined): string {
  const text = description?.replace(/\s+/g, ' ').trim();
  if (!text || text.length < 40) {
    return 'Une nouvelle vidéo est en ligne sur Wab-infos TV.';
  }
  return truncateVideoDescription(text, 280);
}

export async function publishNewYoutubeVideoNewsletters(
  targetVideoId?: string
): Promise<PublishYoutubeVideosNewsletterResult> {
  if (!newsletterConfig.enabled || !newsletterConfig.sendOnYoutube) {
    return { ok: true, skipped: true, reason: 'newsletter_disabled' };
  }

  if (!(await isMailReady())) {
    return { ok: true, skipped: true, reason: 'mail_not_configured' };
  }

  const channelId = siteConfig.youtubeChannelId;
  if (!channelId) {
    return { ok: true, skipped: true, reason: 'no_youtube_channel' };
  }

  const subscribers = await getActiveSubscribers();
  if (subscribers.length > newsletterConfig.maxRecipientsPerRun) {
    return { ok: false, skipped: true, reason: 'rate_limited', processed: [] };
  }
  if (subscribers.length === 0) {
    return { ok: true, skipped: true, reason: 'no_subscribers', processed: [] };
  }

  const recent = await getChannelRecentVideosFresh(channelId, targetVideoId ? 20 : 8);
  const processed: NonNullable<PublishYoutubeVideosNewsletterResult['processed']> = [];

  for (const video of recent) {
    if (targetVideoId && video.videoId !== targetVideoId) continue;
    const title = formatDisplayTitle(video.title);

    if (!targetVideoId && !isRecentPublication(video.publishedAt)) {
      processed.push({
        youtubeId: video.videoId,
        title,
        sent: 0,
        failed: 0,
        skipped: true,
        reason: 'too_old',
      });
      continue;
    }

    const claimId = await claimYoutubeNewsletterSend(video.videoId, title);
    if (!claimId) {
      processed.push({
        youtubeId: video.videoId,
        title,
        sent: 0,
        failed: 0,
        skipped: true,
        reason: 'already_sent',
      });
      continue;
    }

    const payloadBase = {
      title,
      excerpt: videoExcerpt(video.description),
      videoUrl: `${newsletterConfig.siteUrl}${getVideoPagePath(video.videoId)}`,
      imageUrl: `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
      publishedAt: video.publishedAt,
    };

    const recipients = subscribers.map((subscriber) => ({
      email: subscriber.email,
      unsubscribeUrl: buildUnsubscribeUrl(subscriber.unsubscribeToken),
    }));
    const queuedCount = await enqueueYoutubeNewsletter({
      video: {
        title,
        excerpt: payloadBase.excerpt,
        videoUrl: payloadBase.videoUrl,
        imageUrl: payloadBase.imageUrl,
        publishedAt: payloadBase.publishedAt,
      },
      recipients,
    });
    processed.push({ youtubeId: video.videoId, title, sent: 0, failed: 0, skipped: queuedCount === 0, reason: queuedCount === 0 ? 'already_queued' : undefined });
  }

  const anyFailed = processed.some((row) => row.failed > 0 && !row.skipped);
  return { ok: !anyFailed, processed };
}

export async function sendLatestYoutubeVideoNewsletter(): Promise<PublishYoutubeVideosNewsletterResult> {
  if (!newsletterConfig.enabled || !newsletterConfig.sendOnYoutube) {
    return { ok: true, skipped: true, reason: 'newsletter_disabled' };
  }

  const channelId = siteConfig.youtubeChannelId;
  if (!channelId) {
    return { ok: true, skipped: true, reason: 'no_youtube_channel' };
  }

  const recent = await getChannelRecentVideosFresh(channelId, 20);
  const newest = recent.reduce<(typeof recent)[number] | null>((best, video) => {
    if (!best) return video;
    return Date.parse(video.publishedAt) > Date.parse(best.publishedAt) ? video : best;
  }, null);

  if (!newest) {
    return { ok: true, skipped: true, reason: 'no_video', processed: [] };
  }

  return publishNewYoutubeVideoNewsletters(newest.videoId);
}
