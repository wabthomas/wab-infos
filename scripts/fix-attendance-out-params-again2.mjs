import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/extras-db.ts';
let text = fs.readFileSync(file, 'utf8');
const before = text;
text = text.replace(
  /\[\s*randomUUID\(\),\s*person,\s*eventTime\.toISOString\(\)\s*\]/,
  "action === 'out' ? [eventTime.toISOString(), person] : [randomUUID(), person, eventTime.toISOString()]",
);
fs.writeFileSync(file, text, 'utf8');
console.log(text === before ? 'MISS' : 'FIXED');
