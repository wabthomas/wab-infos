import { newsletterConfig } from '@/lib/newsletter/config';
import type { SendEmailOptions } from '@/lib/newsletter/types';

export async function sendViaBrevo(options: SendEmailOptions): Promise<void> {
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
      textContent: options.text,
      replyTo: options.replyTo
        ? { email: options.replyTo }
        : { email: newsletterConfig.replyTo },
      headers: options.unsubscribeUrl
        ? {
            'List-Unsubscribe': `<${options.unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          }
        : undefined,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Brevo API ${response.status}: ${body}`);
  }
}
