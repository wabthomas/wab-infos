import { newsletterConfig } from '@/lib/newsletter/config';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendTransactionalEmail(options: SendEmailOptions): Promise<void> {
  const { brevoApiKey, senderEmail, senderName } = newsletterConfig;

  if (!brevoApiKey) {
    throw new Error('BREVO_API_KEY non configurée.');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': brevoApiKey,
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html,
      replyTo: options.replyTo ? { email: options.replyTo } : undefined,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Brevo API ${response.status}: ${body}`);
  }
}

export async function sendBatchEmails(
  emails: SendEmailOptions[],
  concurrency = 5
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < emails.length; i += concurrency) {
    const batch = emails.slice(i, i + concurrency);
    const results = await Promise.allSettled(batch.map((item) => sendTransactionalEmail(item)));

    for (const result of results) {
      if (result.status === 'fulfilled') sent += 1;
      else failed += 1;
    }
  }

  return { sent, failed };
}
