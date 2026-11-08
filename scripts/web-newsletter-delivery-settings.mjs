import fs from 'node:fs';
const file = 'apps/web/src/lib/newsletter/stored-settings.ts';
let text = fs.readFileSync(file, 'utf8');
if (!text.includes('resolveNewsletterDelivery')) {
  text = text.replace(
    "  senderName?: string | null;\n  replyTo?: string | null;\n}",
    "  senderName?: string | null;\n  replyTo?: string | null;\n  provider?: 'smtp' | 'brevo' | null;\n  brevoApiKey?: string | null;\n}",
  );
  text += `
export interface NewsletterDeliverySettings {
  provider: 'smtp' | 'brevo';
  smtp: ResolvedSmtpSettings | null;
  brevoApiKey: string;
}

let deliveryCache: { at: number; value: NewsletterDeliverySettings } | null = null;

/** Priorité : réglage enregistré dans E-mails (Strapi), puis variable d'environnement. */
export async function resolveNewsletterDelivery(): Promise<NewsletterDeliverySettings> {
  if (deliveryCache && Date.now() - deliveryCache.at < 30_000) return deliveryCache.value;
  const stored = await fetchStoredSettings();
  const smtp = await resolveSmtpSettings();
  const envProvider = process.env.NEWSLETTER_PROVIDER?.trim().toLowerCase();
  const provider: 'smtp' | 'brevo' = stored?.provider === 'brevo'
    ? 'brevo'
    : stored?.provider === 'smtp'
      ? 'smtp'
      : envProvider === 'brevo'
        ? 'brevo'
        : 'smtp';
  const brevoApiKey = stored?.brevoApiKey?.trim() || newsletterConfig.brevoApiKey;
  const value: NewsletterDeliverySettings = { provider, smtp, brevoApiKey };
  deliveryCache = { at: Date.now(), value };
  return value;
}
`;
  text = text.replace(
    "export async function isMailReady(): Promise<boolean> {\n  if (await resolveSmtpSettings()) return true;\n  return Boolean(newsletterConfig.enabled && newsletterConfig.brevoApiKey);\n}",
    "export async function isMailReady(): Promise<boolean> {\n  const delivery = await resolveNewsletterDelivery();\n  if (delivery.provider === 'brevo') return Boolean(newsletterConfig.enabled && delivery.brevoApiKey);\n  return Boolean(delivery.smtp);\n}",
  );
}
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('resolveNewsletterDelivery') ? 'OK' : 'MISS');
