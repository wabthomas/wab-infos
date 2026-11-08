import fs from 'node:fs';
const lines = fs.readFileSync('apps/web/src/lib/newsletter/stored-settings.ts','utf8').split(/\r?\n/);
for (let i=110;i<145;i++) console.log(i+1, JSON.stringify(lines[i]));
