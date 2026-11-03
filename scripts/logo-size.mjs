import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/official-export.ts';
let text = fs.readFileSync(file, 'utf8');
text = text.replace("image(ctx, logo, left, 42, 130, 92);", "image(ctx, logo, left, 42, 108, 78);");
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('108, 78') ? 'OK' : 'MISS');
