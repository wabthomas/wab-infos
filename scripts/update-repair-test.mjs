import fs from 'node:fs';
const file = 'tests/rh-repair-text.test.mjs';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(", 'num\u00e9ro de suivi'", '');
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes("num\u00e9ro de suivi") ? 'STILL' : 'UPDATED');
