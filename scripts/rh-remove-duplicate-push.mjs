import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/database.ts';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const filtered = lines.filter(line => !line.trimStart().startsWith('await pushRhDecision('));
fs.writeFileSync(file, filtered.join(eol), 'utf8');
console.log(filtered.length < lines.length ? 'OK' : 'MISS');
