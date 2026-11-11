import fs from 'node:fs';
const lines = fs.readFileSync('apps/redaction/src/components/redaction/rh/chat.tsx','utf8').split(/\r?\n/);
for (let i=0;i<8;i++) console.log(i+1, JSON.stringify(lines[i]));
for (let i=44;i<58;i++) console.log(i+1, JSON.stringify(lines[i]));
for (let i=90;i<112;i++) console.log(i+1, JSON.stringify(lines[i]));
