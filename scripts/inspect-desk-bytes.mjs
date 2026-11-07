import fs from 'node:fs';
const lines = fs.readFileSync('apps/redaction/src/components/redaction/newsletter-desk.tsx','utf8').split(/\r?\n/);
for (let i=448;i<472;i++) console.log(i+1, JSON.stringify(lines[i]));
