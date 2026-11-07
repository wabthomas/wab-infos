import fs from 'node:fs';
const file = 'apps/redaction/src/app/api/redaction/rh/contrats/route.ts';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const projIndex = lines.findIndex(line => line.startsWith('const projection = '));
if (projIndex < 0) { console.log('MISS projection'); process.exit(1); }
lines[projIndex] = lines[projIndex].replace('const projection = ', 'const detailProjection = ');
lines.splice(projIndex + 1, 0, "const listProjection = detailProjection.replace(',k.clauses', '');");
let text = lines.join(eol);
text = text.replace('SELECT ${projection} FROM', 'SELECT ${id ? detailProjection : listProjection} FROM');
text = text.replace('LIMIT ${id ? 1 : 200}', 'LIMIT ${id ? 1 : 100}');
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('listProjection') && text.includes('detailProjection : listProjection') ? 'OK' : 'MISS');
