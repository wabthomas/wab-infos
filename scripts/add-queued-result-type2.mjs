import fs from 'node:fs';
const file = 'apps/web/src/lib/newsletter/send-article.ts';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(/(\s*subscribers\?: number;)/, '$1\n  queued?: boolean;');
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('queued?: boolean') ? 'OK' : 'MISS');
