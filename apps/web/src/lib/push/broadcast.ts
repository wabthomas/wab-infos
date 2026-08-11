import { siteConfig } from '@/config/site';
import { getSiteSettings } from '@/lib/site-settings.server';
import { sendPushToReaders } from '@/lib/push/send';
import { pushConfig } from '@/lib/push/config';
import type { ReaderDailyPushTarget } from '@wab-infos/shared';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

export type ReaderBroadcastTarget = 'site' | 'youtube';

export interface ReaderBroadcastPayload {
  title: string;
  body: string;
  url: string;
}

const SITE_PRESET: ReaderBroadcastPayload = {
  title: 'Wab-infos',
  body: 'De nouvelles actualités vous attendent. Ouvrez Wab-infos pour rester informé.',
  url: '/',
};

const YOUTUBE_PRESET: ReaderBroadcastPayload = {
  title: 'Wab-infos TV',
  body: 'Retrouvez d’autres actus en vidéo sur notre chaîne YouTube.',
  url: siteConfig.youtubeChannelUrl,
};

export function readerBroadcastPreset(target: ReaderBroadcastTarget): ReaderBroadcastPayload {
  return target === 'youtube' ? { ...YOUTUBE_PRESET } : { ...SITE_PRESET };
}

function absoluteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const origin = (pushConfig.siteUrl || siteConfig.url).replace(/\/$/, '');
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
}

export async function broadcastToReaders(payload: {
  title?: string;
  body?: string;
  url?: string;
  target?: ReaderBroadcastTarget;
}): Promise<{ ok: boolean; sent: number; failed: number; url: string }> {
  const preset = readerBroadcastPreset(payload.target === 'youtube' ? 'youtube' : 'site');
  const title = payload.title?.trim() || preset.title;
  const body = payload.body?.trim() || preset.body;
  const url = absoluteUrl(payload.url?.trim() || preset.url);

  const { sent, failed } = await sendPushToReaders({ title, body, url });
  return { ok: sent > 0 && failed === 0, sent, failed, url };
}

function kinshasaStamp(now = new Date()): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Kinshasa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
  };
}

function stampPath(): string {
  return join(process.cwd(), 'tmp', 'reader-daily-push.json');
}

function readLastSentDate(): string | null {
  try {
    const raw = readFileSync(stampPath(), 'utf8');
    const data = JSON.parse(raw) as { date?: string };
    return data.date || null;
  } catch {
    return null;
  }
}

function writeLastSentDate(date: string): void {
  try {
    const file = stampPath();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ date, at: new Date().toISOString() }), 'utf8');
  } catch (error) {
    console.warn('[push/reader-daily] stamp write failed', error);
  }
}

function resolveDailyTarget(
  target: ReaderDailyPushTarget,
  date: string
): ReaderBroadcastTarget {
  if (target === 'site' || target === 'youtube') return target;
  const day = Number(date.slice(-2));
  return day % 2 === 0 ? 'site' : 'youtube';
}

export async function sendReaderDailyEngagementIfDue(): Promise<{
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  sent?: number;
  failed?: number;
  target?: ReaderBroadcastTarget;
}> {
  const settings = await getSiteSettings();
  const config = settings.chrome.readerDailyPush;
  if (!config?.enabled) {
    return { ok: true, skipped: true, reason: 'disabled' };
  }

  const stamp = kinshasaStamp();
  if (stamp.hour !== config.hour) {
    return { ok: true, skipped: true, reason: 'wrong_hour' };
  }
  if (readLastSentDate() === stamp.date) {
    return { ok: true, skipped: true, reason: 'already_sent' };
  }

  const target = resolveDailyTarget(config.target, stamp.date);
  writeLastSentDate(stamp.date);
  const result = await broadcastToReaders({ target });
  return { ...result, target };
}
