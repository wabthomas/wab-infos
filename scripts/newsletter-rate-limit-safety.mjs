import fs from 'node:fs';

// 1) Configuration : limites hébergeur PlanetHoster (200/h, 20 par 10 min).
let config = fs.readFileSync('apps/web/src/lib/newsletter/config.ts', 'utf8');
config = config.replace(
  "  smtpBatchDelayMs: Number(process.env.NEWSLETTER_SMTP_BATCH_DELAY_MS || 400),\n  smtpConcurrency: Number(process.env.NEWSLETTER_SMTP_CONCURRENCY || 2),",
  `  smtpBatchDelayMs: Number(process.env.NEWSLETTER_SMTP_BATCH_DELAY_MS || 600_000),
  smtpConcurrency: Number(process.env.NEWSLETTER_SMTP_CONCURRENCY || 1),
  smtpBatchSize: Number(process.env.NEWSLETTER_SMTP_BATCH_SIZE || 20),
  smtpBatchWindowMs: Number(process.env.NEWSLETTER_SMTP_BATCH_WINDOW_MS || 600_000),
  maxEmailsPerHour: Number(process.env.NEWSLETTER_MAX_PER_HOUR || 200),
  maxRecipientsPerRun: Number(process.env.NEWSLETTER_MAX_PER_RUN || 20),`,
);
fs.writeFileSync('apps/web/src/lib/newsletter/config.ts', config, 'utf8');
console.log('CONFIG', config.includes('maxRecipientsPerRun') ? 'OK' : 'MISS');

// 2) Transport : garde-fous stricts + débit lent.
let transport = fs.readFileSync('apps/web/src/lib/newsletter/transport.ts', 'utf8');
if (!transport.includes('assertSmtpQuota')) {
  transport = transport.replace(
    "function sleep(ms: number): Promise<void> {",
    `const sendWindow: number[] = [];
let lastSmtpSendAt = 0;

function pruneSendWindow(now: number) {
  const windowStart = now - 3_600_000;
  while (sendWindow.length && sendWindow[0] < windowStart) sendWindow.shift();
}

/** Refuse toute rafale au-delà des limites PlanetHoster (200/h, 20 par 10 min). */
function assertSmtpQuota(count: number) {
  const now = Date.now();
  pruneSendWindow(now);
  if (count > Math.max(1, newsletterConfig.smtpBatchSize)) {
    throw new Error(\`Envoi bloqué par sécurité : \${count} destinataires d'un coup, maximum \${newsletterConfig.smtpBatchSize}. Segmentez la liste en blocs de 20 tous les 10 minutes.\`);
  }
  if (sendWindow.length + count > newsletterConfig.maxEmailsPerHour) {
    throw new Error('Envoi bloqué : limite hébergeur de 200 e-mails/heure atteinte. Réessayez plus tard.');
  }
  const waitMs = lastSmtpSendAt + newsletterConfig.smtpBatchWindowMs - now;
  if (lastSmtpSendAt > 0 && waitMs > 0) {
    throw new Error(\`Envoi bloqué : respectez 10 minutes entre deux lots (encore \${Math.ceil(waitMs / 60_000)} min).\`);
  }
}

function recordSmtpSend(count: number) {
  const now = Date.now();
  for (let i = 0; i < count; i += 1) sendWindow.push(now);
  lastSmtpSendAt = now;
}

function sleep(ms: number): Promise<void> {`,
  );
  transport = transport.replace(
    "  if (!(await isMailReady())) {\n    throw new Error('Newsletter non configurée.');\n  }",
    "  if (!(await isMailReady())) {\n    throw new Error('Newsletter non configurée.');\n  }\n\n  assertSmtpQuota(emails.length);",
  );
  transport = transport.replace(
    "  return { sent, failed, skipped };",
    "  if (sent + failed + skipped > 0) recordSmtpSend(sent + failed + skipped);\n  return { sent, failed, skipped };",
  );
}
fs.writeFileSync('apps/web/src/lib/newsletter/transport.ts', transport, 'utf8');
console.log('TRANSPORT', transport.includes('assertSmtpQuota') ? 'OK' : 'MISS');

// 3) Article : ne jamais dépasser un lot ; pas de claim si trop de monde.
let article = fs.readFileSync('apps/web/src/lib/newsletter/send-article.ts', 'utf8');
if (!article.includes('maxRecipientsPerRun')) {
  article = article.replace(
    "  if (subscribers.length === 0) {\n    return { ok: true, skipped: true, reason: 'no_subscribers', subscribers: 0 };\n  }",
    "  if (subscribers.length === 0) {\n    return { ok: true, skipped: true, reason: 'no_subscribers', subscribers: 0 };\n  }\n  if (subscribers.length > newsletterConfig.maxRecipientsPerRun) {\n    return { ok: false, skipped: true, reason: 'rate_limited', subscribers: subscribers.length };\n  }",
  );
}
fs.writeFileSync('apps/web/src/lib/newsletter/send-article.ts', article, 'utf8');
console.log('ARTICLE', article.includes('rate_limited') ? 'OK' : 'MISS');

// 4) YouTube : même garde-fou.
let youtube = fs.readFileSync('apps/web/src/lib/newsletter/send-youtube-videos.ts', 'utf8');
if (!youtube.includes('maxRecipientsPerRun')) {
  youtube = youtube.replace(
    "  const subscribers = await getActiveSubscribers();\n  if (subscribers.length === 0) {\n    return { ok: true, skipped: true, reason: 'no_subscribers', processed: [] };\n  }",
    "  const subscribers = await getActiveSubscribers();\n  if (subscribers.length === 0) {\n    return { ok: true, skipped: true, reason: 'no_subscribers', processed: [] };\n  }\n  if (subscribers.length > newsletterConfig.maxRecipientsPerRun) {\n    return { ok: false, skipped: true, reason: 'rate_limited', processed: [] };\n  }",
  );
}
fs.writeFileSync('apps/web/src/lib/newsletter/send-youtube-videos.ts', youtube, 'utf8');
console.log('YOUTUBE', youtube.includes('rate_limited') ? 'OK' : 'MISS');
