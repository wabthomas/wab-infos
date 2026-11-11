import fs from 'node:fs';
const file = 'apps/redaction/src/app/api/redaction/rh/mon-espace/chat/route.ts';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(",201);\nif(d.action==='presence')", ",201);}\nif(d.action==='presence')");
fs.writeFileSync(file, text, 'utf8');
console.log('OK');
