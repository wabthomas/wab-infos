import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-withdrawals.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
for (let i = 1; i < lines.length; i += 1) {
  if (lines[i].includes("visual.addEventListener('resize', resize);") && lines[i - 1].includes("visual.addEventListener('resize', resize);")) {
    lines.splice(i - 1, 2);
    break;
  }
}
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('CLEANED');
