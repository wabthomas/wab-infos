import fs from 'node:fs';

// Types
{
  const file = 'apps/redaction/src/lib/redaction/newsletter-types.ts';
  const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const i = lines.findIndex(line => line.includes('smtpPassSet: boolean;'));
  if (i >= 0 && !lines.some(line => line.includes('brevoApiKeySet'))) {
    lines.splice(i + 1, 0, "  provider: 'smtp' | 'brevo';", '  brevoApiKeySet: boolean;');
  }
  fs.writeFileSync(file, lines.join(eol), 'utf8');
  console.log('TYPES', fs.readFileSync(file, 'utf8').includes('brevoApiKeySet') ? 'OK' : 'MISS');
}

// Admin
{
  const file = 'apps/redaction/src/lib/redaction/newsletter-admin.ts';
  const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  let i = lines.findIndex(line => line.includes('interface StoredSettings'));
  if (i >= 0) {
    while (i < lines.length && !lines[i].includes('replyTo?: string | null;')) i += 1;
    if (i < lines.length) lines.splice(i + 1, 0, "  provider?: 'smtp' | 'brevo' | null;", '  brevoApiKey?: string | null;');
  }
  i = lines.findIndex(line => line.includes('replyTo: process.env.NEWSLETTER_REPLY_TO'));
  if (i >= 0) lines.splice(i + 1, 0, "    provider: process.env.NEWSLETTER_PROVIDER === 'brevo' ? 'brevo' : 'smtp',", '    brevoApiKeySet: Boolean(process.env.BREVO_API_KEY),');
  i = lines.findIndex(line => line.trim() === 'enabled: fallback.enabled,');
  if (i >= 0) lines.splice(i + 1, 0, "      provider: process.env.NEWSLETTER_PROVIDER === 'brevo' ? 'brevo' : 'smtp',", '      brevoApiKeySet: Boolean(process.env.BREVO_API_KEY),');
  i = lines.findIndex(line => line.trim() === 'enabled: stored.enabled ?? true,');
  if (i >= 0) lines.splice(i + 1, 0, "    provider: stored.provider === 'brevo' ? 'brevo' : 'smtp',", '    brevoApiKeySet: Boolean(stored.brevoApiKey?.trim() || process.env.BREVO_API_KEY),');
  i = lines.findIndex(line => line.includes('export async function saveNewsletterSettings(input: {'));
  if (i >= 0) lines.splice(i + 1, 0, "  provider: 'smtp' | 'brevo';", '  brevoApiKey?: string;');
  i = lines.findIndex(line => line.includes("const previousPass = current.status === 200"));
  if (i >= 0) lines.splice(i + 1, 0,
    "  const previousBrevoKey = current.status === 200 ? current.data?.data?.brevoApiKey?.trim() || '' : '';",
    "  const nextBrevoKey = input.brevoApiKey?.trim() || previousBrevoKey || process.env.BREVO_API_KEY?.trim() || '';",
    "  if (input.provider === 'brevo' && !nextBrevoKey) throw new Error('Clé API Brevo requise pour ce mode d’envoi.');",
  );
  i = lines.findIndex(line => line.includes('const payload = {'));
  if (i >= 0) lines.splice(i + 1, 0, '    provider: input.provider,', '    brevoApiKey: nextBrevoKey,');
  fs.writeFileSync(file, lines.join(eol), 'utf8');
  console.log('ADMIN', fs.readFileSync(file, 'utf8').includes('nextBrevoKey') ? 'OK' : 'MISS');
}
