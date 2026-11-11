import fs from 'node:fs';
const lines = fs.readFileSync('apps/redaction/src/components/redaction/rh/chat.tsx','utf8').split(/\r?\n/);
for (let i=100;i<112;i++) console.log(i+1, JSON.stringify(lines[i]));
