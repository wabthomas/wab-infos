import fs from 'node:fs';
const file = 'apps/web/src/lib/newsletter/transport.ts';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const start = lines.findIndex(line => line.includes("if (resolveNewsletterProvider() === 'brevo')"));
if (start >= 0) {
  let end = start;
  while (end < lines.length && lines[end].trim() !== '}') end += 1;
  lines.splice(start, end - start + 1);
}
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log(fs.readFileSync(file, 'utf8').includes('resolveNewsletterProvider') ? 'STILL' : 'OK');
