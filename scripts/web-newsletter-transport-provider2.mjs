import fs from 'node:fs';
// Brevo
{
  const file = 'apps/web/src/lib/newsletter/brevo.ts';
  const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const i = lines.findIndex(line => line.includes('export async function sendViaBrevo(options: SendEmailOptions)'));
  lines[i] = 'export async function sendViaBrevo(options: SendEmailOptions, apiKey?: string): Promise<void> {';
  lines[i + 1] = "  const { brevoApiKey: envKey, senderEmail, senderName } = newsletterConfig;\n  const brevoApiKey = apiKey?.trim() || envKey;";
  fs.writeFileSync(file, lines.join(eol), 'utf8');
  console.log('BREVO', fs.readFileSync(file, 'utf8').includes('apiKey?: string') ? 'OK' : 'MISS');
}
// Transport
{
  const file = 'apps/web/src/lib/newsletter/transport.ts';
  const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const start = lines.findIndex(line => line.includes('export async function sendTransactionalEmail'));
  let end = start;
  while (end < lines.length && lines[end].trim() !== '}') end += 1;
  lines.splice(start, end - start + 1,
    'export async function sendTransactionalEmail(options: SendEmailOptions): Promise<void> {',
    '  const delivery = await resolveNewsletterDelivery();',
    "  if (delivery.provider === 'brevo' && delivery.brevoApiKey) {",
    '    await sendViaBrevo(options, delivery.brevoApiKey);',
    '    return;',
    '  }',
    '  if (delivery.smtp) {',
    '    await sendViaSmtp(options);',
    '    return;',
    '  }',
    "  throw new Error('Aucun transport e-mail configuré (SMTP ou Brevo).');",
    '}',
  );
  const smtpIdx = lines.findIndex(line => line.includes('const smtp = await resolveSmtpSettings();'));
  lines.splice(smtpIdx, 2,
    '  const delivery = await resolveNewsletterDelivery();',
    "  const provider = delivery.provider === 'brevo' && delivery.brevoApiKey ? 'brevo' : delivery.smtp ? 'smtp' : delivery.provider;",
    "  if (provider === 'brevo') assertBrevoQuota(emails.length);",
    '  else assertSmtpQuota(emails.length);',
  );
  fs.writeFileSync(file, lines.join(eol), 'utf8');
  console.log('TRANSPORT', fs.readFileSync(file, 'utf8').includes('assertBrevoQuota(emails.length)') ? 'OK' : 'MISS');
}
