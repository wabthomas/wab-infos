import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/official-export.ts';
let text = fs.readFileSync(file, 'utf8');
const eol = text.includes('\r\n') ? '\r\n' : '\n';
const lines = text.split(/\r?\n/);
const i = lines.findIndex(l => l.includes("'LETTRE ADMINISTRATIVE'"));
if (i >= 0) {
  const indent = lines[i].match(/^\s*/)[0];
  lines.splice(i, 2,
    `${indent}const heading = doc.title?.trim() || (doc.kind === 'lettre' ? 'LETTRE ADMINISTRATIVE' : 'COMMUNIQUÉ OFFICIEL');`,
    `${indent}if (doc.showTitle !== false) add(heading, 22, 20, { bold: true });`,
    `${indent}if (doc.showSubject !== false) add(\`Objet : \${doc.subject}\`, 18, 26, { bold: true });`,
  );
}
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log(lines.some(l => l.includes('const heading')) ? 'OK' : 'MISS');
