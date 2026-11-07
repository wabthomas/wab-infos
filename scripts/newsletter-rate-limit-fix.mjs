import fs from 'node:fs';

function insertAfter(file, predicate, linesToInsert) {
  const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const index = lines.findIndex(predicate);
  if (index < 0) return false;
  lines.splice(index + 1, 0, ...linesToInsert);
  fs.writeFileSync(file, lines.join(eol), 'utf8');
  return true;
}

// config : bloc de limites
{
  const file = 'apps/web/src/lib/newsletter/config.ts';
  const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const delay = lines.findIndex(line => line.trim().startsWith('smtpBatchDelayMs:'));
  if (delay >= 0 && !lines.some(line => line.includes('smtpBatchSize'))) {
    lines.splice(delay, 2,
      '  smtpBatchDelayMs: Number(process.env.NEWSLETTER_SMTP_BATCH_DELAY_MS || 600_000),',
      '  smtpConcurrency: Number(process.env.NEWSLETTER_SMTP_CONCURRENCY || 1),',
      '  smtpBatchSize: Number(process.env.NEWSLETTER_SMTP_BATCH_SIZE || 20),',
      '  smtpBatchWindowMs: Number(process.env.NEWSLETTER_SMTP_BATCH_WINDOW_MS || 600_000),',
      '  maxEmailsPerHour: Number(process.env.NEWSLETTER_MAX_PER_HOUR || 200),',
      '  maxRecipientsPerRun: Number(process.env.NEWSLETTER_MAX_PER_RUN || 20),',
    );
    fs.writeFileSync(file, lines.join(eol), 'utf8');
  }
  console.log('CONFIG', fs.readFileSync(file, 'utf8').includes('smtpBatchSize') ? 'OK' : 'MISS');
}

// article : bloquer si la liste dépasse un lot
{
  const file = 'apps/web/src/lib/newsletter/send-article.ts';
  const ok = insertAfter(file, line => line.trim() === 'const subscribers = await getActiveSubscribers();', [
    '  if (subscribers.length > newsletterConfig.maxRecipientsPerRun) {',
    "    return { ok: false, skipped: true, reason: 'rate_limited', subscribers: subscribers.length };",
    '  }',
  ]);
  console.log('ARTICLE', ok ? 'OK' : 'MISS');
}

// youtube : même garde-fou
{
  const file = 'apps/web/src/lib/newsletter/send-youtube-videos.ts';
  const ok = insertAfter(file, line => line.trim() === 'const subscribers = await getActiveSubscribers();', [
    '  if (subscribers.length > newsletterConfig.maxRecipientsPerRun) {',
    "    return { ok: false, skipped: true, reason: 'rate_limited', processed: [] };",
    '  }',
  ]);
  console.log('YOUTUBE', ok ? 'OK' : 'MISS');
}
