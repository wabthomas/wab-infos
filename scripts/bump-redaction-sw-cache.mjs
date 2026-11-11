import fs from 'node:fs';
const file = 'apps/redaction/public/sw-redaction.js';
let text = fs.readFileSync(file, 'utf8');
text = text.replace("const OFFLINE_CACHE = 'redaction-offline-v6';", "const OFFLINE_CACHE = 'redaction-offline-v7';");
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('redaction-offline-v7') ? 'OK' : 'MISS');
