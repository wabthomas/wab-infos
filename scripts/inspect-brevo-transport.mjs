import fs from 'node:fs';
const b = fs.readFileSync('apps/web/src/lib/newsletter/brevo.ts','utf8').split(/\r?\n/);
console.log('BREVO'); for (let i=0;i<8;i++) console.log(i+1, JSON.stringify(b[i]));
const t = fs.readFileSync('apps/web/src/lib/newsletter/transport.ts','utf8').split(/\r?\n/);
console.log('TRANSPORT'); for (let i=52;i<88;i++) console.log(i+1, JSON.stringify(t[i]));
