import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { newsletterConfig } from '@/lib/newsletter/config';
import { sendBatchEmails } from '@/lib/newsletter/transport';
import { isSubscriberActive } from '@/lib/newsletter/subscribers';
import { renderArticleNewsletterHtml, renderArticleNewsletterText, buildArticleNewsletterSubject, type ArticleNewsletterData } from '@/lib/newsletter/article-template';
import { renderVideoNewsletterHtml, renderVideoNewsletterText, buildVideoNewsletterSubject, type VideoNewsletterData } from '@/lib/newsletter/video-template';
import { getArticlePath } from '@/config/site';
import { resolveNewsletterDelivery } from '@/lib/newsletter/stored-settings';
import { orderRecipients, recipientRank } from '@/lib/newsletter/recipient-priority';
import { getArticleForNewsletter } from '@/lib/newsletter/subscribers';
import { getStrapiMediaAbsoluteUrl } from '@/lib/utils';

export const NEWSLETTER_BATCH_SIZE = Math.max(1, newsletterConfig.maxRecipientsPerRun);
const QUEUE_WINDOW_MS = Math.max(60_000, newsletterConfig.smtpBatchWindowMs);
const isBrevo = async () => { const delivery = await resolveNewsletterDelivery(); return (delivery.provider === 'brevo' && Boolean(delivery.brevoApiKey)) || (delivery.provider === 'smtp' && delivery.relay === 'brevo'); };
const queueWindowMs = async () => ((await isBrevo()) ? Math.max(30_000, newsletterConfig.brevoBatchWindowMs) : QUEUE_WINDOW_MS);
const queueBatchSize = async () => ((await isBrevo()) ? Math.max(1, newsletterConfig.brevoBatchSize) : NEWSLETTER_BATCH_SIZE);
function todayKinshasa(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kinshasa' });
}

type Recipient = { email: string; unsubscribeUrl: string };
type QueueItem = {
  id: string;
  kind: 'article' | 'youtube';
  createdAt: string;
  articleSlug?: string;
  video?: { title: string; excerpt: string; videoUrl: string; imageUrl: string; publishedAt: string };
  recipients: Recipient[];
  cursor: number;
  sent: number;
  failed: number;
  completedAt?: string;
  attempts?: number;
};
type QueueFile = { lastSentAt?: string; day?: string; daySent?: number; items: QueueItem[] };

const queuePath = process.env.NEWSLETTER_QUEUE_FILE
  || path.resolve(process.cwd(), '../../.data/newsletter-queue.json');

let io: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = io.then(task, task);
  io = run.catch(() => undefined);
  return run;
}

async function readQueue(): Promise<QueueFile> {
  try {
    const raw = await fs.readFile(queuePath, 'utf8');
    const parsed = JSON.parse(raw) as QueueFile;
    if (!parsed || !Array.isArray(parsed.items)) return { items: [] };
    return parsed;
  } catch {
    return { items: [] };
  }
}

async function writeQueue(file: QueueFile): Promise<void> {
  await fs.mkdir(path.dirname(queuePath), { recursive: true });
  const temporary = `${queuePath}.${process.pid}.tmp`;
  const pending = file.items.filter(item => !item.completedAt || Date.now() - Date.parse(item.completedAt) < 7 * 86_400_000);
  await fs.writeFile(temporary, JSON.stringify({ ...file, items: pending }), 'utf8');
  await fs.rename(temporary, queuePath);
}

export async function enqueueArticleNewsletter(input: {
  slug: string;
  recipients: Recipient[];
}): Promise<number> {
  return serialize(async () => {
    const file = await readQueue();
    if (file.items.some(item => !item.completedAt && item.kind === 'article' && item.articleSlug === input.slug)) return 0;
    file.items.push({
      id: randomUUID(), kind: 'article', createdAt: new Date().toISOString(),
      articleSlug: input.slug, recipients: orderRecipients(input.recipients.filter(recipient => recipientRank(recipient.email) < 3)), cursor: 0, sent: 0, failed: 0,
    });
    await writeQueue(file);
    return input.recipients.length;
  });
}

export async function enqueueYoutubeNewsletter(input: {
  video: NonNullable<QueueItem['video']>;
  recipients: Recipient[];
}): Promise<number> {
  return serialize(async () => {
    const file = await readQueue();
    if (file.items.some(item => !item.completedAt && item.kind === 'youtube' && item.video?.videoUrl === input.video.videoUrl)) return 0;
    file.items.push({
      id: randomUUID(), kind: 'youtube', createdAt: new Date().toISOString(),
      video: input.video, recipients: orderRecipients(input.recipients.filter(recipient => recipientRank(recipient.email) < 3)), cursor: 0, sent: 0, failed: 0,
    });
    await writeQueue(file);
    return input.recipients.length;
  });
}

export async function newsletterQueueStatus(): Promise<{ pending: number; nextBatchAt: string | null }> {
  const file = await readQueue();
  const pending = file.items.filter(item => !item.completedAt).length;
  const last = file.lastSentAt ? Date.parse(file.lastSentAt) : 0;
  const next = last ? Math.max(0, last + QUEUE_WINDOW_MS - Date.now()) : 0;
  return { pending, nextBatchAt: next ? new Date(Date.now() + next).toISOString() : null };
}

/** Envoie un seul lot (20 max) si la fenêtre de 10 minutes est écoulée. */
export async function drainNewsletterQueue(): Promise<{ sent: number; failed: number; remaining: number; skipped?: string }> {
  return serialize(async () => {
    const file = await readQueue();
    const pending = file.items.filter(item => !item.completedAt && item.cursor < item.recipients.length);
    if (!pending.length) return { sent: 0, failed: 0, remaining: 0, skipped: 'empty' };
    const last = file.lastSentAt ? Date.parse(file.lastSentAt) : 0;
    if (last && Date.now() - last < await queueWindowMs()) return { sent: 0, failed: 0, remaining: pending.length, skipped: 'window' };
    const day = todayKinshasa();
    if (file.day !== day) { file.day = day; file.daySent = 0; }
    const dailyLimit = (await isBrevo()) ? newsletterConfig.brevoDailyLimit : Number.POSITIVE_INFINITY;
    if ((file.daySent ?? 0) >= dailyLimit) return { sent: 0, failed: 0, remaining: pending.length, skipped: 'daily_limit' };

    const item = pending[0];
    const allowed = Math.min(await queueBatchSize(), Math.max(0, dailyLimit - (file.daySent ?? 0)));
    if (allowed <= 0) return { sent: 0, failed: 0, remaining: pending.length, skipped: 'daily_limit' };
    const slice = item.recipients.slice(item.cursor, item.cursor + allowed);
    const articlePayload = item.kind === 'article' && item.articleSlug ? await getArticle(item.articleSlug) : null;
    if (item.kind === 'article' && !articlePayload) throw new Error('Article newsletter introuvable.');
    const emails = slice.map((recipient) => {
      if (articlePayload) {
        const payload: ArticleNewsletterData = { ...articlePayload, unsubscribeUrl: recipient.unsubscribeUrl };
        return { to: recipient.email, subject: buildArticleNewsletterSubject(payload), html: renderArticleNewsletterHtml(payload), text: renderArticleNewsletterText(payload), unsubscribeUrl: recipient.unsubscribeUrl, replyTo: newsletterConfig.replyTo };
      }
      const video = item.video!;
      const payload: VideoNewsletterData = { ...video, unsubscribeUrl: recipient.unsubscribeUrl };
      return { to: recipient.email, subject: buildVideoNewsletterSubject(payload), html: renderVideoNewsletterHtml(payload), text: renderVideoNewsletterText(payload), unsubscribeUrl: recipient.unsubscribeUrl, replyTo: newsletterConfig.replyTo };
    });

    const tokens = new Map(slice.map(recipient => [recipient.email, recipient.unsubscribeUrl]));
    const result = await sendBatchEmails(emails, async (mail) => {
      const unsubscribeUrl = tokens.get(mail.to) || '';
      const token = new URL(unsubscribeUrl).searchParams.get('token') || '';
      return token ? isSubscriberActive(token, mail.to) : true;
    });

    file.lastSentAt = new Date().toISOString();
    // Aucun destinataire ne doit être perdu : en cas d'échec SMTP, on réessaiera le même lot.
    if (result.failed > 0) {
      item.failed += result.failed;
      item.attempts = (item.attempts ?? 0) + 1;
      await writeQueue(file);
      return { sent: result.sent, failed: result.failed, remaining: item.recipients.length - item.cursor, retry: true };
    }
    item.cursor += slice.length;
    item.sent += result.sent;
    file.daySent = (file.daySent ?? 0) + slice.length;
    const remaining = item.recipients.length - item.cursor;
    if (remaining <= 0) item.completedAt = new Date().toISOString();
    await writeQueue(file);
    return { sent: result.sent, failed: 0, remaining: Math.max(0, remaining) };
  });
}

async function getArticle(slug: string): Promise<Omit<ArticleNewsletterData, 'unsubscribeUrl'> | null> {
  const article = await getArticleForNewsletter(slug);
  if (!article) return null;
  const categorySlug = article.category?.slug ?? 'actualite';
  return {
    title: article.seoTitle || article.title,
    excerpt: article.excerpt,
    articleUrl: `${newsletterConfig.siteUrl}${getArticlePath({ slug: article.slug, category: article.category }, categorySlug)}`,
    imageUrl: getStrapiMediaAbsoluteUrl(article.featuredImage?.url) ?? `${newsletterConfig.siteUrl}/og-default.jpg`,
    categoryName: article.category?.name,
    categoryColor: article.category?.color,
    authorName: article.author?.name,
    publishedAt: article.publishedAt,
    isBreaking: article.isBreaking ?? false,
  };
}
