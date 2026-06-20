export const newsletterConfig = {
  enabled: process.env.NEWSLETTER_ENABLED === 'true',
  sendOnPublish: process.env.NEWSLETTER_SEND_ON_PUBLISH === 'true',
  brevoApiKey: process.env.BREVO_API_KEY || '',
  senderEmail: process.env.NEWSLETTER_SENDER_EMAIL || 'newsletter@wab-infos.com',
  senderName: process.env.NEWSLETTER_SENDER_NAME || 'Wab-infos',
  secret: process.env.NEWSLETTER_SECRET || process.env.REVALIDATION_SECRET || '',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://app.wab-infos.com',
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || 'Wab-infos',
};

export function isNewsletterConfigured(): boolean {
  return Boolean(newsletterConfig.brevoApiKey && newsletterConfig.senderEmail);
}
