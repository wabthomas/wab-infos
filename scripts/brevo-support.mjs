import fs from 'node:fs';

// 1) Config Brevo (offre gratuite : 300 e-mails/jour).
let config = fs.readFileSync('apps/web/src/lib/newsletter/config.ts', 'utf8');
if (!config.includes('brevoDailyLimit')) {
  config = config.replace(
    /(\s*maxRecipientsPerRun: Number\(process\.env\.NEWSLETTER_MAX_PER_RUN \|\| 20\),)/,
    `$1
  brevoDailyLimit: Number(process.env.NEWSLETTER_BREVO_DAILY_LIMIT || 300),
  brevoBatchSize: Number(process.env.NEWSLETTER_BREVO_BATCH_SIZE || 100),
  brevoBatchWindowMs: Number(process.env.NEWSLETTER_BREVO_BATCH_WINDOW_MS || 60_000),`,
  );
}
fs.writeFileSync('apps/web/src/lib/newsletter/config.ts', config, 'utf8');
console.log('CONFIG', config.includes('brevoDailyLimit') ? 'OK' : 'MISS');

// 2) Transport : Brevo prioritaire quand NEWSLETTER_PROVIDER=brevo + quota quotidien.
let transport = fs.readFileSync('apps/web/src/lib/newsletter/transport.ts', 'utf8');
transport = transport.replace(
  "export async function sendTransactionalEmail(options: SendEmailOptions): Promise<void> {\n  if (await resolveSmtpSettings()) {",
  "export async function sendTransactionalEmail(options: SendEmailOptions): Promise<void> {\n  if (process.env.NEWSLETTER_PROVIDER === 'brevo' && newsletterConfig.brevoApiKey) {\n    await sendViaBrevo(options);\n    return;\n  }\n  if (await resolveSmtpSettings()) {",
);
if (!transport.includes('assertBrevoQuota')) {
  transport = transport.replace(
    "function recordSmtpSend(count: number) {",
    `const brevoSent = { day: '', count: 0 };
function assertBrevoQuota(count: number) {
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kinshasa' });
  if (brevoSent.day !== day) { brevoSent.day = day; brevoSent.count = 0; }
  if (brevoSent.count + count > newsletterConfig.brevoDailyLimit) {
    throw new Error(\`Quota Brevo gratuit atteint (\${newsletterConfig.brevoDailyLimit}/jour). Les envois reprendront demain.\`);
  }
}
function recordBrevoSend(count: number) {
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kinshasa' });
  if (brevoSent.day !== day) { brevoSent.day = day; brevoSent.count = 0; }
  brevoSent.count += count;
}

function recordSmtpSend(count: number) {`,
  );
  transport = transport.replace(
    "  assertSmtpQuota(emails.length);\n\n  const smtp = await resolveSmtpSettings();\n  const provider = smtp ? 'smtp' : resolveNewsletterProvider();",
    "  const smtp = await resolveSmtpSettings();\n  const explicit = process.env.NEWSLETTER_PROVIDER?.trim().toLowerCase();\n  const provider = explicit === 'brevo' && newsletterConfig.brevoApiKey\n    ? 'brevo'\n    : explicit === 'smtp' && smtp\n      ? 'smtp'\n      : smtp\n        ? 'smtp'\n        : resolveNewsletterProvider();\n  if (provider === 'brevo') assertBrevoQuota(emails.length);\n  else assertSmtpQuota(emails.length);",
  );
  transport = transport.replace(
    "  const batchDelay = provider === 'smtp' ? newsletterConfig.smtpBatchDelayMs : 0;",
    "  const batchDelay = provider === 'smtp' ? newsletterConfig.smtpBatchDelayMs : 0;",
  );
  transport = transport.replace(
    "  if (sent + failed + skipped > 0) recordSmtpSend(sent + failed + skipped);",
    "  if (provider === 'brevo') recordBrevoSend(sent + failed + skipped);\n  else if (sent + failed + skipped > 0) recordSmtpSend(sent + failed + skipped);",
  );
}
fs.writeFileSync('apps/web/src/lib/newsletter/transport.ts', transport, 'utf8');
console.log('TRANSPORT', transport.includes('assertBrevoQuota') ? 'OK' : 'MISS');
