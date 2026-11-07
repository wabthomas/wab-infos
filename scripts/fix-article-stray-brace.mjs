import fs from 'node:fs';
const file = 'apps/web/src/lib/newsletter/send-article.ts';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const index = lines.findIndex(line => line.trim() === 'const subscribers = await getActiveSubscribers();');
if (index >= 0 && lines[index + 1]?.trim() === '}') lines.splice(index + 1, 1);
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log(lines[index + 1]?.trim());
