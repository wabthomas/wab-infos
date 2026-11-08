import fs from 'node:fs';

// 1) Strapi schema
const schemaPath = 'apps/cms/src/api/newsletter-setting/content-types/newsletter-setting/schema.json';
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
schema.attributes.provider = { type: 'enumeration', enum: ['smtp', 'brevo'], default: 'smtp' };
schema.attributes.brevoApiKey = { type: 'string', private: true };
fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2) + '\n', 'utf8');
console.log('CMS', schema.attributes.brevoApiKey ? 'OK' : 'MISS');

// 2) View type
let types = fs.readFileSync('apps/redaction/src/lib/redaction/newsletter-types.ts', 'utf8');
if (!types.includes('brevoApiKeySet')) {
  types = types.replace("  smtpPassSet: boolean;\n  source: 'cms' | 'env' | 'none';", "  smtpPassSet: boolean;\n  provider: 'smtp' | 'brevo';\n  brevoApiKeySet: boolean;\n  source: 'cms' | 'env' | 'none';");
}
fs.writeFileSync('apps/redaction/src/lib/redaction/newsletter-types.ts', types, 'utf8');
console.log('TYPES', types.includes('brevoApiKeySet') ? 'OK' : 'MISS');

// 3) Admin
const file = 'apps/redaction/src/lib/redaction/newsletter-admin.ts';
let text = fs.readFileSync(file, 'utf8');
if (!text.includes('brevoApiKey')) {
  text = text.replace(
    "  senderName?: string | null;\n  replyTo?: string | null;\n}",
    "  senderName?: string | null;\n  replyTo?: string | null;\n  provider?: 'smtp' | 'brevo' | null;\n  brevoApiKey?: string | null;\n}",
  );
  text = text.replace(
    "      enabled: fallback.enabled,\n      smtpHost: fallback.smtpHost,",
    "      enabled: fallback.enabled,\n      provider: process.env.NEWSLETTER_PROVIDER === 'brevo' ? 'brevo' : 'smtp',\n      brevoApiKeySet: Boolean(process.env.BREVO_API_KEY),\n      smtpHost: fallback.smtpHost,",
  );
  text = text.replace(
    "    enabled: stored.enabled ?? true,\n    smtpHost: stored.smtpHost?.trim() || fallback.smtpHost,",
    "    enabled: stored.enabled ?? true,\n    provider: stored.provider === 'brevo' ? 'brevo' : 'smtp',\n    brevoApiKeySet: Boolean(stored.brevoApiKey?.trim() || process.env.BREVO_API_KEY),\n    smtpHost: stored.smtpHost?.trim() || fallback.smtpHost,",
  );
  text = text.replace(
    "export async function saveNewsletterSettings(input: {\n  enabled: boolean;",
    "export async function saveNewsletterSettings(input: {\n  enabled: boolean;\n  provider: 'smtp' | 'brevo';\n  brevoApiKey?: string;",
  );
  text = text.replace(
    "  const previousPass = current.status === 200 ? current.data?.data?.smtpPass?.trim() || '' : '';\n  const nextPass = input.smtpPass?.trim() || previousPass;",
    "  const previousPass = current.status === 200 ? current.data?.data?.smtpPass?.trim() || '' : '';\n  const previousBrevoKey = current.status === 200 ? current.data?.data?.brevoApiKey?.trim() || '' : '';\n  const nextPass = input.smtpPass?.trim() || previousPass;\n  const nextBrevoKey = input.brevoApiKey?.trim() || previousBrevoKey || process.env.BREVO_API_KEY?.trim() || '';\n  if (input.provider === 'brevo' && !nextBrevoKey) throw new Error('Clé API Brevo requise pour ce mode d’envoi.');",
  );
  text = text.replace(
    "  const payload = {\n    enabled: input.enabled,",
    "  const payload = {\n    enabled: input.enabled,\n    provider: input.provider,\n    brevoApiKey: nextBrevoKey,",
  );
}
fs.writeFileSync(file, text, 'utf8');
console.log('ADMIN', text.includes('brevoApiKey') ? 'OK' : 'MISS');
