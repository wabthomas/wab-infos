import fs from 'node:fs';
const file = 'apps/redaction/src/app/api/redaction/rh/organisation/assets/[key]/route.ts';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  /    const type = file\.type\.toLowerCase\(\);\r?\n    const bytes = Buffer\.from\(await file\.arrayBuffer\(\)\);\r?\n    if \(!validImage\([^\n]*\r?\n/,
  `    const bytes = Buffer.from(await file.arrayBuffer());
    const type = detectImage(bytes);
    if (!type) return json({ error: 'Formats autorisés : JPG, PNG (transparence acceptée) ou WebP.' }, 415);
`,
);
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('validImage') ? 'STILL' : 'FIXED');
