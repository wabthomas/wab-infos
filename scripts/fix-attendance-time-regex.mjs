import fs from 'node:fs';
const file = 'apps/redaction/src/app/api/redaction/rh/organisation/route.ts';
let text = fs.readFileSync(file, 'utf8');
const before = text;
text = text.replace("/^([01]\\\\d|2[0-3]):[0-5]\\\\d$/", "/^([01]\\d|2[0-3]):[0-5]\\d$/");
fs.writeFileSync(file, text, 'utf8');
console.log(text === before ? 'MISS' : 'FIXED', text.includes('/^([01]\\d|2[0-3]):[0-5]\\d$/') ? 'REGEX_OK' : 'REGEX_BAD');
