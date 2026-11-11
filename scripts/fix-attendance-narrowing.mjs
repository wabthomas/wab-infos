import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/attendance-review.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const open = lines.findIndex(line => line.includes('RhFormModal open={Boolean(reviewing)}'));
if (open < 0) { console.log('MISS'); process.exit(1); }
lines.splice(open + 1, 0, '      {reviewing && <>');
const close = lines.findIndex((line, i) => i > open && line.trim() === '</RhFormModal>');
lines.splice(close, 0, '      </>}');
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('OK');
