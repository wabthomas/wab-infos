import fs from 'node:fs';
const lines = fs.readFileSync('apps/redaction/src/app/api/redaction/newsletter/route.ts','utf8').split(/\r?\n/);
for (let i=35;i<78;i++) console.log(i+1, JSON.stringify(lines[i]));
