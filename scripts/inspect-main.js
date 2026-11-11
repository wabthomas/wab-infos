import fs from 'node:fs';
const lines = fs.readFileSync('apps/redaction/src/components/redaction/redaction-shell.tsx','utf8').split(/\r?\n/);
for (let i=720;i<735;i++) console.log(i+1, JSON.stringify(lines[i]));
