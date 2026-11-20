import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-rh-dashboard.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const starts = lines.map((line, index) => line.trim() === '{flags.financeEnabled ? (' ? index : -1).filter(index => index >= 0);
if (starts.length < 2) { console.log('MISS', starts); process.exit(1); }
const start = starts[1];
const access = lines.findIndex(line => line.includes('Accès rapides'));
if (access < 0) { console.log('MISS_ACCESS'); process.exit(1); }
let end = access;
while (end < lines.length && lines[end].trim() !== '</section>') end += 1;
lines.splice(start, end - start + 1);
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('REMOVED', start + 1, end + 1, 'lines', end - start + 1);
