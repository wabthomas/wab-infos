import {
  isNewsletterConfigured,
  newsletterConfig,
  resolveNewsletterProvider,
} from '@/lib/newsletter/config';
import { sendViaBrevo } from '@/lib/newsletter/brevo';
import { sendViaSmtp } from '@/lib/newsletter/smtp';
import type { BatchSendResult, SendEmailOptions } from '@/lib/newsletter/types';

export type { SendEmailOptions, BatchSendResult };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendTransactionalEmail(options: SendEmailOptions): Promise<void> {
  const provider = resolveNewsletterProvider();
  if (!provider) {
    throw new Error('Aucun transport e-mail configuré (SMTP ou Brevo).');
  }

  if (provider === 'smtp') {
    await sendViaSmtp(options);
    return;
  }

  await sendViaBrevo(options);
}

/** Envoi par lots avec débit limité (SMTP mutualisé) */
export async function sendBatchEmails(
  emails: SendEmailOptions[]
): Promise<BatchSendResult> {
  if (!isNewsletterConfigured()) {
    throw new Error('Newsletter non configurée.');
  }

  const provider = resolveNewsletterProvider();
  const concurrency =
    provider === 'smtp'
      ? Math.max(1, newsletterConfig.smtpConcurrency)
      : Math.max(1, newsletterConfig.brevoConcurrency);
  const batchDelay = provider === 'smtp' ? newsletterConfig.smtpBatchDelayMs : 0;

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < emails.length; i += concurrency) {
    if (i > 0 && batchDelay > 0) {
      await sleep(batchDelay);
    }

    const batch = emails.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((item) => sendTransactionalEmail(item))
    );

    for (const result of results) {
      if (result.status === 'fulfilled') sent += 1;
      else failed += 1;
    }
  }

  return { sent, failed };
}
