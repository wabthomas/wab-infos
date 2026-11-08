import fs from 'node:fs';
// Interface relay
{
  const file = 'apps/web/src/lib/newsletter/stored-settings.ts';
  const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const start = lines.findIndex(line => line.includes('export interface NewsletterDeliverySettings'));
  let i = start;
  while (i < lines.length && !lines[i].includes('brevoApiKey: string;')) i += 1;
  if (!lines.some(line => line.includes("relay: 'brevo' | 'planet'"))) lines.splice(i + 1, 0, "  relay: 'brevo' | 'planet' | null;");
  fs.writeFileSync(file, lines.join(eol), 'utf8');
  console.log('STORED', fs.readFileSync(file, 'utf8').includes("relay: 'brevo' | 'planet'") ? 'OK' : 'MISS');
}
// Transport provider block
{
  const file = 'apps/web/src/lib/newsletter/transport.ts';
  const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const idx = lines.findIndex(line => line.includes('const provider = delivery.provider'));
  if (idx >= 0) {
    lines[idx] = "  const brevoRelay = delivery.provider === 'smtp' && delivery.relay === 'brevo';";
    lines.splice(idx + 1, 0, "  const provider = (delivery.provider === 'brevo' && delivery.brevoApiKey) || brevoRelay ? 'brevo' : delivery.smtp ? 'smtp' : delivery.provider;");
  }
  fs.writeFileSync(file, lines.join(eol), 'utf8');
  console.log('TRANSPORT', fs.readFileSync(file, 'utf8').includes('brevoRelay') ? 'OK' : 'MISS');
}
