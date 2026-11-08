import fs from 'node:fs';
// 1) Détection du relais Brevo dans la résolution d'envoi.
let stored = fs.readFileSync('apps/web/src/lib/newsletter/stored-settings.ts', 'utf8');
if (!stored.includes('relay:')) {
  stored = stored.replace(
    "export interface NewsletterDeliverySettings {\n  provider: 'smtp' | 'brevo';\n  smtp: ResolvedSmtpSettings | null;\n  brevoApiKey: string;\n}",
    "export interface NewsletterDeliverySettings {\n  provider: 'smtp' | 'brevo';\n  relay: 'brevo' | 'planet' | null;\n  smtp: ResolvedSmtpSettings | null;\n  brevoApiKey: string;\n}",
  );
  stored = stored.replace(
    "  const value: NewsletterDeliverySettings = { provider, smtp, brevoApiKey };",
    "  const relay: 'brevo' | 'planet' | null = smtp ? ((smtp.host || '').toLowerCase().includes('smtp-relay.brevo.com') ? 'brevo' : 'planet') : null;\n  const value: NewsletterDeliverySettings = { provider, relay, smtp, brevoApiKey };",
  );
}
fs.writeFileSync('apps/web/src/lib/newsletter/stored-settings.ts', stored, 'utf8');
console.log('STORED', stored.includes("relay: 'brevo'") ? 'OK' : 'MISS');

// 2) Transport : quotas Brevo pour le relais.
let transport = fs.readFileSync('apps/web/src/lib/newsletter/transport.ts', 'utf8');
if (!transport.includes("delivery.relay === 'brevo'")) {
  transport = transport.replace(
    "  const delivery = await resolveNewsletterDelivery();\n  const provider = delivery.provider === 'brevo' && delivery.brevoApiKey ? 'brevo' : delivery.smtp ? 'smtp' : delivery.provider;\n  if (provider === 'brevo') assertBrevoQuota(emails.length);\n  else assertSmtpQuota(emails.length);",
    "  const delivery = await resolveNewsletterDelivery();\n  const brevoRelay = delivery.provider === 'smtp' && delivery.relay === 'brevo';\n  const provider = (delivery.provider === 'brevo' && delivery.brevoApiKey) || brevoRelay ? 'brevo' : delivery.smtp ? 'smtp' : delivery.provider;\n  if (provider === 'brevo') assertBrevoQuota(emails.length);\n  else assertSmtpQuota(emails.length);",
  );
}
fs.writeFileSync('apps/web/src/lib/newsletter/transport.ts', transport, 'utf8');
console.log('TRANSPORT', transport.includes('brevoRelay') ? 'OK' : 'MISS');

// 3) File : mêmes limites pour le relais Brevo.
let queue = fs.readFileSync('apps/web/src/lib/newsletter/queue.ts', 'utf8');
queue = queue.replace(
  "const isBrevo = async () => { const delivery = await resolveNewsletterDelivery(); return delivery.provider === 'brevo' && Boolean(delivery.brevoApiKey); };",
  "const isBrevo = async () => { const delivery = await resolveNewsletterDelivery(); return (delivery.provider === 'brevo' && Boolean(delivery.brevoApiKey)) || (delivery.provider === 'smtp' && delivery.relay === 'brevo'); };",
);
fs.writeFileSync('apps/web/src/lib/newsletter/queue.ts', queue, 'utf8');
console.log('QUEUE', queue.includes("delivery.relay === 'brevo'") ? 'OK' : 'MISS');

// 4) UI : libellé + aide relais Brevo.
let desk = fs.readFileSync('apps/redaction/src/components/redaction/newsletter-desk.tsx', 'utf8');
desk = desk.replace('<option value="smtp">SMTP N0C</option>', '<option value="smtp">SMTP (N0C ou relais Brevo)</option>');
if (!desk.includes('relais Brevo : smtp-relay.brevo.com')) {
  desk = desk.replace(
    '          <span className="text-xs font-semibold text-muted-foreground">Serveur SMTP</span>',
    '          <span className="text-xs font-semibold text-muted-foreground">Serveur SMTP</span>\n            <span className="block text-[11px] text-muted-foreground">Relais Brevo : smtp-relay.brevo.com · port 587 · mot de passe = clé SMTP xsmtpsib-…</span>',
  );
}
fs.writeFileSync('apps/redaction/src/components/redaction/newsletter-desk.tsx', desk, 'utf8');
console.log('UI', desk.includes('smtp-relay.brevo.com') ? 'OK' : 'MISS');
