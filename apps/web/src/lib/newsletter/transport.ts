import { newsletterConfig } from '@/lib/newsletter/config';
import { isMailReady, resolveNewsletterDelivery } from '@/lib/newsletter/stored-settings';
import { sendViaBrevo } from '@/lib/newsletter/brevo';
import { sendViaSmtp } from '@/lib/newsletter/smtp';
import type { BatchSendResult, SendEmailOptions } from '@/lib/newsletter/types';

export type { SendEmailOptions, BatchSendResult };

const sendWindow: number[] = [];
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
    throw new Error(`Envoi bloqué par sécurité : ${count} destinataires d'un coup, maximum ${newsletterConfig.smtpBatchSize}. Segmentez la liste en blocs de 20 tous les 10 minutes.`);
  }
  if (sendWindow.length + count > newsletterConfig.maxEmailsPerHour) {
    throw new Error('Envoi bloqué : limite hébergeur de 200 e-mails/heure atteinte. Réessayez plus tard.');
  }
  const waitMs = lastSmtpSendAt + newsletterConfig.smtpBatchWindowMs - now;
  if (lastSmtpSendAt > 0 && waitMs > 0) {
    throw new Error(`Envoi bloqué : respectez 10 minutes entre deux lots (encore ${Math.ceil(waitMs / 60_000)} min).`);
  }
}

const brevoSent = { day: '', count: 0 };
function assertBrevoQuota(count: number) {
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kinshasa' });
  if (brevoSent.day !== day) { brevoSent.day = day; brevoSent.count = 0; }
  if (brevoSent.count + count > newsletterConfig.brevoDailyLimit) {
    throw new Error(`Quota Brevo gratuit atteint (${newsletterConfig.brevoDailyLimit}/jour). Les envois reprendront demain.`);
  }
}
function recordBrevoSend(count: number) {
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kinshasa' });
  if (brevoSent.day !== day) { brevoSent.day = day; brevoSent.count = 0; }
  brevoSent.count += count;
}

function recordSmtpSend(count: number) {
  const now = Date.now();
  for (let i = 0; i < count; i += 1) sendWindow.push(now);
  lastSmtpSendAt = now;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendTransactionalEmail(options: SendEmailOptions): Promise<void> {
  const delivery = await resolveNewsletterDelivery();
  if (delivery.provider === 'brevo' && delivery.brevoApiKey) {
    await sendViaBrevo(options, delivery.brevoApiKey);
    return;
  }
  if (delivery.smtp) {
    await sendViaSmtp(options);
    return;
  }
  throw new Error('Aucun transport e-mail configuré (SMTP ou Brevo).');
}



/** Envoi par lots avec débit limité (SMTP mutualisé) */
export async function sendBatchEmails(
  emails: SendEmailOptions[],
  beforeSend?: (email: SendEmailOptions) => Promise<boolean>
): Promise<BatchSendResult> {
  if (!(await isMailReady())) {
    throw new Error('Newsletter non configurée.');
  }

  const delivery = await resolveNewsletterDelivery();
  const provider = delivery.provider === 'brevo' && delivery.brevoApiKey ? 'brevo' : delivery.smtp ? 'smtp' : delivery.provider;
  if (provider === 'brevo') assertBrevoQuota(emails.length);
  else assertSmtpQuota(emails.length);
  const concurrency =
    provider === 'smtp'
      ? Math.max(1, newsletterConfig.smtpConcurrency)
      : Math.max(1, newsletterConfig.brevoConcurrency);
  const batchDelay = provider === 'smtp' ? newsletterConfig.smtpBatchDelayMs : 0;

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < emails.length; i += concurrency) {
    if (i > 0 && batchDelay > 0) {
      await sleep(batchDelay);
    }

    const batch = emails.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(async (item) => {
        if (beforeSend && !(await beforeSend(item))) return false;
        await sendTransactionalEmail(item);
        return true;
      })
    );

    for (const result of results) {
      if (result.status === 'rejected') failed += 1;
      else if (result.value) sent += 1;
      else skipped += 1;
    }
  }

  if (provider === 'brevo') recordBrevoSend(sent + failed + skipped);
  else if (sent + failed + skipped > 0) recordSmtpSend(sent + failed + skipped);
  return { sent, failed, skipped };
}
