import fs from 'node:fs';
const file = 'apps/web/src/lib/newsletter/send-article.ts';
let text = fs.readFileSync(file, 'utf8');
text = text.replace('  subscribers?: number;\n}', '  subscribers?: number;\n  queued?: boolean;\n}');
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('queued?: boolean') ? 'OK' : 'MISS');
