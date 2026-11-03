import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-withdrawals.tsx';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
lines.forEach((line, index) => {
  if (/[\u00c3\u00e2\u00c2\u00e9\ufffd]/.test(line) && /[\u00c3\u00e2\u00c2\ufffd]/.test(line)) {
    console.log(`${index + 1}: ${JSON.stringify(line).slice(0, 400)}`);
  }
});
