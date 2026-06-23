export const newsletterConfig = {
  enabled: process.env.NEWSLETTER_ENABLED === 'true',
  sendOnPublish: process.env.NEWSLETTER_SEND_ON_PUBLISH === 'true',
  brevoApiKey: process.env.BREVO_API_KEY || '',
  senderEmail: process.env.NEWSLETTER_SENDER_EMAIL || 'newsletter@wab-infos.com',
  senderName: process.env.NEWSLETTER_SENDER_NAME || 'Wab-infos',
  replyTo:
    process.env.NEWSLETTER_REPLY_TO ||
    process.env.NEXT_PUBLIC_REDACTION_EMAIL ||
    'redaction@wab-infos.com',
  secret: process.env.NEWSLETTER_SECRET || process.env.REVALIDATION_SECRET || '',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://wab-infos.com',
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || 'Wab-infos',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  smtpBatchDelayMs: Number(process.env.NEWSLETTER_SMTP_BATCH_DELAY_MS || 400),
  smtpConcurrency: Number(process.env.NEWSLETTER_SMTP_CONCURRENCY || 2),
  brevoConcurrency: Number(process.env.NEWSLETTER_BREVO_CONCURRENCY || 5),
};

export type NewsletterProvider = 'smtp' | 'brevo';

function isSmtpConfigured(): boolean {
  const { smtp } = newsletterConfig;
  return Boolean(smtp.host && smtp.user && smtp.pass && newsletterConfig.senderEmail);
}

export function resolveNewsletterProvider(): NewsletterProvider | null {
  const explicit = process.env.NEWSLETTER_PROVIDER?.trim().toLowerCase();

  if (explicit === 'smtp') {
    return isSmtpConfigured() ? 'smtp' : null;
  }
  if (explicit === 'brevo') {
    return newsletterConfig.brevoApiKey ? 'brevo' : null;
  }

  if (isSmtpConfigured()) return 'smtp';
  if (newsletterConfig.brevoApiKey) return 'brevo';
  return null;
}

export function isNewsletterConfigured(): boolean {
  return resolveNewsletterProvider() !== null;
}
