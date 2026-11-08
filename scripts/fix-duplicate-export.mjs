import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/database.ts';
let text = fs.readFileSync(file, 'utf8');
text = text.replace('export export async function queueRhNotification', 'export async function queueRhNotification');
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('export export') ? 'STILL' : 'OK');
