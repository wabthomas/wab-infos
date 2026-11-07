import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/contracts.ts';
let text = fs.readFileSync(file, 'utf8');
text = text.replace("split('\\n').length > 1000", "split('\\n').length > 250");
fs.writeFileSync(file, text, 'utf8');
console.log((text.match(/> 250/g) || []).length);
