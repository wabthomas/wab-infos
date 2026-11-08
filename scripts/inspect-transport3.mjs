import fs from 'node:fs';
const lines = fs.readFileSync('apps/web/src/lib/newsletter/transport.ts','utf8').split(/\r?\n/);
for (let i=54;i<80;i++) console.log(i+1, JSON.stringify(lines[i]));
