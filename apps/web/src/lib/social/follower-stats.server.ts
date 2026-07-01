import 'server-only';

import { unstable_cache } from 'next/cache';
import { siteConfig } from '@/config/site';
import {
  socialFollowChannels,
  type SocialFollowPlatform,
  type SocialFollowerEntry,
} from '@/config/social-follow';
import { getSiteSettings, getVisibleSocialLinks } from '@/lib/site-settings.server';
import { socialConfig } from '@/lib/social/config';
import { formatFollowerCount } from '@/lib/social/format-follower-count';

export { formatFollowerCount };

function readFallback(platform: SocialFollowPlatform): number | null {
  const envKey = `SOCIAL_FOLLOWERS_${platform.toUpperCase()}` as const;
  const raw = process.env[envKey];
  if (!raw?.trim()) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

async function fetchYoutubeSubscribers(): Promise<number | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = siteConfig.youtubeChannelId;
  if (!apiKey || !channelId) return readFallback('youtube');

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/channels');
    url.searchParams.set('part', 'statistics');
    url.searchParams.set('id', channelId);
    url.searchParams.set('key', apiKey);

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return readFallback('youtube');

    const data = (await res.json()) as {
      items?: Array<{ statistics?: { subscriberCount?: string } }>;
    };
    const count = data.items?.[0]?.statistics?.subscriberCount;
    if (!count) return readFallback('youtube');
    return Number.parseInt(count, 10);
  } catch {
    return readFallback('youtube');
  }
}

async function fetchFacebookFollowers(): Promise<number | null> {
  const { pageId, accessToken } = socialConfig.facebook;
  if (!pageId || !accessToken) return readFallback('facebook');

  try {
    const url = new URL(`https://graph.facebook.com/v21.0/${pageId}`);
    url.searchParams.set('fields', 'followers_count,fan_count');
    url.searchParams.set('access_token', accessToken);

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return readFallback('facebook');

    const data = (await res.json()) as { followers_count?: number; fan_count?: number };
    const count = data.followers_count ?? data.fan_count;
    return typeof count === 'number' && count > 0 ? count : readFallback('facebook');
  } catch {
    return readFallback('facebook');
  }
}

async function fetchXFollowers(): Promise<number | null> {
  const bearer = socialConfig.x.bearerToken;
  if (!bearer) return readFallback('x');

  try {
    const url = new URL('https://api.twitter.com/2/users/by/username/wabinfos');
    url.searchParams.set('user.fields', 'public_metrics');

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${bearer}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return readFallback('x');

    const data = (await res.json()) as {
      data?: { public_metrics?: { followers_count?: number } };
    };
    const count = data.data?.public_metrics?.followers_count;
    return typeof count === 'number' && count > 0 ? count : readFallback('x');
  } catch {
    return readFallback('x');
  }
}

async function resolveFollowers(platform: SocialFollowPlatform): Promise<number | null> {
  switch (platform) {
    case 'youtube':
      return fetchYoutubeSubscribers();
    case 'facebook':
      return fetchFacebookFollowers();
    case 'x':
      return fetchXFollowers();
    case 'whatsapp':
    case 'tiktok':
      return readFallback(platform);
    default:
      return null;
  }
}

async function loadSocialFollowerStats(): Promise<SocialFollowerEntry[]> {
  const settings = await getSiteSettings();
  const channels = getVisibleSocialLinks(settings).map((link) => ({
    id: link.id,
    label: link.label,
    href: link.href,
    handle: link.handle,
    brandColor: link.brandColor,
  }));

  const source = channels.length > 0 ? channels : socialFollowChannels;

  const counts = await Promise.all(
    source.map(async (channel) => {
      const manual = settings.socialLinks.find((l) => l.id === channel.id)?.followers;
      if (manual != null && manual > 0) {
        return { ...channel, followers: manual };
      }
      return {
        ...channel,
        followers: await resolveFollowers(channel.id),
      };
    })
  );
  return counts;
}

function followerStatsCacheKey(): string {
  const fallbackParts = socialFollowChannels.map((channel) => {
    const envKey = `SOCIAL_FOLLOWERS_${channel.id.toUpperCase()}`;
    return `${channel.id}:${process.env[envKey]?.trim() ?? ''}`;
  });
  return [
    ...fallbackParts,
    `yt:${process.env.YOUTUBE_API_KEY ? '1' : '0'}`,
    `fb:${socialConfig.facebook.pageId && socialConfig.facebook.accessToken ? '1' : '0'}`,
    `x:${socialConfig.x.bearerToken ? '1' : '0'}`,
  ].join('|');
}

export async function getSocialFollowerStats(): Promise<SocialFollowerEntry[]> {
  const cacheKey = followerStatsCacheKey();
  const cached = unstable_cache(loadSocialFollowerStats, ['social-follower-stats', cacheKey], {
    revalidate: 3600,
    tags: ['social-follower-stats'],
  });
  return cached();
}
