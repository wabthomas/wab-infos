import fs from 'node:fs';
const file = 'apps/web/src/lib/newsletter/stored-settings.ts';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const start = lines.findIndex(line => line.includes('interface StoredNewsletterSettings'));
if (start >= 0) {
  let i = start;
  while (i < lines.length && !lines[i].includes('replyTo?: string | null;')) i += 1;
  if (i < lines.length && !lines.some(line => line.includes("provider?: 'smtp'"))) lines.splice(i + 1, 0, "  provider?: 'smtp' | 'brevo' | null;", '  brevoApiKey?: string | null;');
}
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log(fs.readFileSync(file, 'utf8').includes('brevoApiKey?: string | null') ? 'OK' : 'MISS');
