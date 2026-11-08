import fs from 'node:fs';

// 1) Schéma Strapi : fournisseur + clé Brevo.
const schemaPath = 'apps/cms/src/api/newsletter-setting/content-types/newsletter-setting/schema.json';
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
schema.attributes.provider = { type: 'enumeration', enum: ['smtp', 'brevo'], default: 'smtp' };
schema.attributes.brevoApiKey = { type: 'string', private: true };
fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2) + '\n', 'utf8');
console.log('CMS', schema.attributes.provider ? 'OK' : 'MISS');

// 2) Type de vue.
let types = fs.readFileSync('apps/redaction/src/lib/redaction/newsletter-types.ts', 'utf8');
types = types.replace("  smtpPassSet: boolean;\n  source: 'cms' | 'env' | 'none';", "  smtpPassSet: boolean;\n  provider: 'smtp' | 'brevo';\n  brevoApiKeySet: boolean;\n  source: 'cms' | 'env' | 'none';");
fs.writeFileSync('apps/redaction/src/lib/redaction/newsletter-types.ts', types, 'utf8');
console.log('TYPES', types.includes('brevoApiKeySet') ? 'OK' : 'MISS');

// 3) Lib admin.
const file = 'apps/redaction/src/lib/redaction/newsletter-admin.ts';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
for (let i = 0; i < lines.length; i += 1) {
  if (lines[i].includes('interface StoredSettings')) {
    lines.splice(i + 1, 0, "  provider?: 'smtp' | 'brevo' | null;", '  brevoApiKey?: string | null;');
    i += 2;
  }
  if (lines[i].includes('export async function saveNewsletterSettings(input: {')) {
    lines.splice(i + 1, 0, "  provider: 'smtp' | 'brevo';", '  brevoApiKey?: string;');
    i += 2;
  }
  if (lines[i].includes("const previousPass = current.status === 200")) {
    lines.splice(i + 1, 0,
      "  const previousBrevoKey = current.status === 200 ? current.data?.data?.brevoApiKey?.trim() || '' : '';",
      "  const nextBrevoKey = input.brevoApiKey?.trim() || previousBrevoKey;",
      "  if (input.provider === 'brevo' && !nextBrevoKey) throw new Error('Clé API Brevo requise pour ce mode d’envoi.');",
    );
    i += 4;
  }
  if (lines[i].includes('const payload = {') && lines[i + 1]?.includes('enabled: input.enabled')) {
    lines.splice(i + 1, 0, '    provider: input.provider,', '    brevoApiKey: nextBrevoKey,');
    i += 2;
  }
  if (lines[i].includes('const fallback = envFallback();')) {
    // ajout des champs dans les retours : on insère dans les objets retournés plus bas via remplacement textuel.
  }
}
let text = lines.join(eol);
text = text.replace(/(return \{\s*enabled: fallback\.enabled,)/, '$1\n      provider: process.env.NEWSLETTER_PROVIDER === \'brevo\' ? \'brevo\' : \'smtp\',\n      brevoApiKeySet: Boolean(process.env.BREVO_API_KEY),');
text = text.replace(/(return \{\s*enabled: stored\.enabled \?\? true,)/, '$1\n    provider: stored.provider === \'brevo\' ? \'brevo\' : \'smtp\',\n    brevoApiKeySet: Boolean(stored.brevoApiKey?.trim() || fallback.brevoKey),');
fs.writeFileSync(file, text, 'utf8');
console.log('ADMIN', text.includes('brevoApiKey') ? 'OK' : 'MISS');
