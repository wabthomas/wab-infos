import fs from 'node:fs';
// Brevo : clé paramétrable
let brevo = fs.readFileSync('apps/web/src/lib/newsletter/brevo.ts', 'utf8');
brevo = brevo.replace(
  "export async function sendViaBrevo(options: SendEmailOptions): Promise<void> {\n  const { brevoApiKey, senderEmail, senderName } = newsletterConfig;",
  "export async function sendViaBrevo(options: SendEmailOptions, apiKey?: string): Promise<void> {\n  const { brevoApiKey: envKey, senderEmail, senderName } = newsletterConfig;\n  const brevoApiKey = apiKey?.trim() || envKey;",
);
fs.writeFileSync('apps/web/src/lib/newsletter/brevo.ts', brevo, 'utf8');
console.log('BREVO', brevo.includes('apiKey?: string') ? 'OK' : 'MISS');

// Transport : fournisseur enregistré
let transport = fs.readFileSync('apps/web/src/lib/newsletter/transport.ts', 'utf8');
transport = transport.replace("import { isMailReady, resolveSmtpSettings } from '@/lib/newsletter/stored-settings';", "import { isMailReady, resolveNewsletterDelivery } from '@/lib/newsletter/stored-settings';");
transport = transport.replace(
  "export async function sendTransactionalEmail(options: SendEmailOptions): Promise<void> {\n  if (await resolveSmtpSettings()) {\n    await sendViaSmtp(options);\n    return;\n  }\n\n  if (resolveNewsletterProvider() === 'brevo') {\n    await sendViaBrevo(options);\n    return;\n  }\n\n  throw new Error('Aucun transport e-mail configurÃ© (SMTP ou Brevo).');\n}",
  "export async function sendTransactionalEmail(options: SendEmailOptions): Promise<void> {\n  const delivery = await resolveNewsletterDelivery();\n  if (delivery.provider === 'brevo' && delivery.brevoApiKey) {\n    await sendViaBrevo(options, delivery.brevoApiKey);\n    return;\n  }\n  if (delivery.smtp) {\n    await sendViaSmtp(options);\n    return;\n  }\n  throw new Error('Aucun transport e-mail configuré (SMTP ou Brevo).');\n}",
);
transport = transport.replace(
  "  const smtp = await resolveSmtpSettings();\n  const provider = smtp ? 'smtp' : resolveNewsletterProvider();\n  const concurrency =",
  "  const delivery = await resolveNewsletterDelivery();\n  const provider = delivery.provider === 'brevo' && delivery.brevoApiKey ? 'brevo' : delivery.smtp ? 'smtp' : delivery.provider;\n  if (provider === 'brevo') assertBrevoQuota(emails.length);\n  else assertSmtpQuota(emails.length);\n  const concurrency =",
);
transport = transport.replace("import { newsletterConfig, resolveNewsletterProvider } from '@/lib/newsletter/config';", "import { newsletterConfig } from '@/lib/newsletter/config';");
fs.writeFileSync('apps/web/src/lib/newsletter/transport.ts', transport, 'utf8');
console.log('TRANSPORT', transport.includes('resolveNewsletterDelivery') && transport.includes('assertBrevoQuota(emails.length)') ? 'OK' : 'MISS');
