import fs from 'node:fs';
const file = 'apps/redaction/src/app/api/redaction/rh/organisation/logo-public/route.ts';
let text = fs.readFileSync(file, 'utf8');
text = text.replace('return new Response(row.file_bytes as Buffer, {', 'return new Response(new Uint8Array(row.file_bytes as Buffer), {');
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('new Uint8Array') ? 'OK' : 'MISS');
