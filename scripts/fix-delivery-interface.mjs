import fs from 'node:fs';
const file = 'apps/web/src/lib/newsletter/stored-settings.ts';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const start = lines.findIndex(line => line.includes('export interface NewsletterDeliverySettings'));
const end = lines.findIndex((line, i) => i > start && line.trim() === '}');
if (!lines.slice(start, end).some(line => line.includes('relay:'))) lines.splice(end, 0, "  relay: 'brevo' | 'planet' | null;");
const readyStart = lines.findIndex(line => line.includes('export async function isMailReady'));
if (readyStart >= 0) {
  let readyEnd = readyStart;
  while (readyEnd < lines.length && lines[readyEnd].trim() !== '}') readyEnd += 1;
  lines.splice(readyStart, readyEnd - readyStart + 1,
    'export async function isMailReady(): Promise<boolean> {',
    '  const delivery = await resolveNewsletterDelivery();',
    "  if (delivery.provider === 'brevo') return Boolean(newsletterConfig.enabled && delivery.brevoApiKey);",
    "  if (delivery.provider === 'smtp') return Boolean(delivery.smtp);",
    '  return false;',
    '}',
  );
}
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log(fs.readFileSync(file, 'utf8').includes("relay: 'brevo' | 'planet' | null;") ? 'OK' : 'MISS');
