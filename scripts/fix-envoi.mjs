import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-withdrawals.tsx';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(/'Envoi[^']*'/g, "'Envoi...'");
fs.writeFileSync(file, text, 'utf8');
console.log(text.match(/Envoi[^\n]*/)?.[0] ?? 'not found');
