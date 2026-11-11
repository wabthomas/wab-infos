import fs from 'node:fs';
const lines = fs.readFileSync('apps/redaction/src/components/redaction/rh/chat.tsx','utf8').split(/\r?\n/);
console.log(JSON.stringify(lines[335]));
