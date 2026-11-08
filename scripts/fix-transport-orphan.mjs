import fs from 'node:fs';
const file = 'apps/web/src/lib/newsletter/transport.ts';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const end = lines.findIndex(line => line.trim() === '}' && lines.slice(0, line).filter(l => l.includes('export async function sendTransactionalEmail')).length === 1);
// Supprime la seconde occurrence du throw orpheline et son accolade.
const throwLines = lines.map((line, i) => line.includes("throw new Error('Aucun transport e-mail configuré") ? i : -1).filter(i => i >= 0);
const orphan = throwLines[1];
if (orphan) {
  lines.splice(orphan, 2);
}
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log(fs.readFileSync(file, 'utf8').includes("throw new Error('Aucun transport e-mail configuré") ? 'ONCE_OR_MORE' : 'MISS');
