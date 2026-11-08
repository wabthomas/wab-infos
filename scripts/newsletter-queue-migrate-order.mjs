import fs from 'node:fs';
const file = 'apps/web/src/lib/newsletter/queue.ts';
let text = fs.readFileSync(file, 'utf8');
if (!text.includes('item.cursor === 0')) {
  text = text.replace(
    "    const item = pending[0];",
    "    const item = pending[0];\n    if (item.cursor === 0) item.recipients = orderRecipients(item.recipients);",
  );
}
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('item.cursor === 0') ? 'OK' : 'MISS');
