import fs from 'node:fs';
const file = 'apps/web/src/lib/newsletter/queue.ts';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
lines = lines.map(line => {
  if (line.includes("import { getArticlePath } from '@/config/site';")) return line + "\nimport { resolveNewsletterDelivery } from '@/lib/newsletter/stored-settings';";
  if (line.includes('const isBrevo = () => process.env.NEWSLETTER_PROVIDER')) return 'const isBrevo = async () => { const delivery = await resolveNewsletterDelivery(); return delivery.provider === \'brevo\' && Boolean(delivery.brevoApiKey); };';
  if (line.includes('const queueWindowMs = () => (isBrevo()')) return 'const queueWindowMs = async () => ((await isBrevo()) ? Math.max(30_000, newsletterConfig.brevoBatchWindowMs) : QUEUE_WINDOW_MS);';
  if (line.includes('const queueBatchSize = () => (isBrevo()')) return 'const queueBatchSize = async () => ((await isBrevo()) ? Math.max(1, newsletterConfig.brevoBatchSize) : NEWSLETTER_BATCH_SIZE);';
  return line;
});
let text = lines.join(eol);
text = text.replace('if (last && Date.now() - last < queueWindowMs()) return', 'if (last && Date.now() - last < await queueWindowMs()) return');
text = text.replace("const dailyLimit = isBrevo() ? newsletterConfig.brevoDailyLimit : Number.POSITIVE_INFINITY;", "const dailyLimit = (await isBrevo()) ? newsletterConfig.brevoDailyLimit : Number.POSITIVE_INFINITY;");
text = text.replace('const allowed = Math.min(queueBatchSize(), Math.max(0, dailyLimit - (file.daySent ?? 0)));', 'const allowed = Math.min(await queueBatchSize(), Math.max(0, dailyLimit - (file.daySent ?? 0)));');
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('await resolveNewsletterDelivery') && text.includes('await queueBatchSize()') ? 'OK' : 'MISS');
