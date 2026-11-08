import fs from 'node:fs';
const file = 'apps/web/src/lib/newsletter/queue.ts';
let text = fs.readFileSync(file, 'utf8');

text = text.replace(
  "const QUEUE_WINDOW_MS = Math.max(60_000, newsletterConfig.smtpBatchWindowMs);",
  `const QUEUE_WINDOW_MS = Math.max(60_000, newsletterConfig.smtpBatchWindowMs);
const isBrevo = () => process.env.NEWSLETTER_PROVIDER === 'brevo' && Boolean(newsletterConfig.brevoApiKey);
const queueWindowMs = () => (isBrevo() ? Math.max(30_000, newsletterConfig.brevoBatchWindowMs) : QUEUE_WINDOW_MS);
const queueBatchSize = () => (isBrevo() ? Math.max(1, Math.min(newsletterConfig.brevoBatchSize, newsletterConfig.maxRecipientsPerRun)) : NEWSLETTER_BATCH_SIZE);
function todayKinshasa(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kinshasa' });
}`,
);
text = text.replace("type QueueFile = { lastSentAt?: string; items: QueueItem[] };", "type QueueFile = { lastSentAt?: string; day?: string; daySent?: number; items: QueueItem[] };");
text = text.replace(
  "    const last = file.lastSentAt ? Date.parse(file.lastSentAt) : 0;\n    if (last && Date.now() - last < QUEUE_WINDOW_MS) return { sent: 0, failed: 0, remaining: pending.length, skipped: 'window' };",
  "    const last = file.lastSentAt ? Date.parse(file.lastSentAt) : 0;\n    if (last && Date.now() - last < queueWindowMs()) return { sent: 0, failed: 0, remaining: pending.length, skipped: 'window' };\n    const day = todayKinshasa();\n    if (file.day !== day) { file.day = day; file.daySent = 0; }\n    const dailyLimit = isBrevo() ? newsletterConfig.brevoDailyLimit : Number.POSITIVE_INFINITY;\n    if ((file.daySent ?? 0) >= dailyLimit) return { sent: 0, failed: 0, remaining: pending.length, skipped: 'daily_limit' };",
);
text = text.replace(
  "    const slice = item.recipients.slice(item.cursor, item.cursor + NEWSLETTER_BATCH_SIZE);",
  "    const allowed = Math.min(queueBatchSize(), Math.max(0, dailyLimit - (file.daySent ?? 0)));\n    if (allowed <= 0) return { sent: 0, failed: 0, remaining: pending.length, skipped: 'daily_limit' };\n    const slice = item.recipients.slice(item.cursor, item.cursor + allowed);",
);
text = text.replace(
  "    item.cursor += slice.length;\n    item.sent += result.sent;",
  "    item.cursor += slice.length;\n    item.sent += result.sent;\n    file.daySent = (file.daySent ?? 0) + slice.length;",
);
fs.writeFileSync(file, text, 'utf8');
console.log('QUEUE', text.includes('queueBatchSize') && text.includes('dailyLimit') ? 'OK' : 'MISS');
