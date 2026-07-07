export type SocialFollowPlatform = 'whatsapp' | 'facebook' | 'x' | 'youtube' | 'tiktok';

export interface SocialFollowChannel {
  id: SocialFollowPlatform;
  label: string;
  href: string;
  handle: string;
  brandColor: string;
}

export interface SocialFollowerEntry extends SocialFollowChannel {
  followers: number | null;
}

export const socialFollowChannels: SocialFollowChannel[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    href:
      process.env.NEXT_PUBLIC_SOCIAL_WHATSAPP_URL ||
      'https://whatsapp.com/channel/0029VaD4Z9a1CYobJ2TWBD07',
    handle: 'Canal Wab-infos',
    brandColor: '#25D366',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    href: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL || 'https://facebook.com/wabinfos',
    handle: '@wabinfos',
    brandColor: '#1877F2',
  },
  {
    id: 'x',
    label: 'X',
    href: process.env.NEXT_PUBLIC_SOCIAL_X_URL || 'https://x.com/wabinfos',
    handle: '@wabinfos',
    brandColor: '#0f0f0f',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    href:
      process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_URL || 'https://youtube.com/@wabinfostv',
    handle: '@wabinfostv',
    brandColor: '#FF0000',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    href: process.env.NEXT_PUBLIC_SOCIAL_TIKTOK_URL || 'https://tiktok.com/@wabinfostv',
    handle: '@wabinfostv',
    brandColor: '#010101',
  },
];
