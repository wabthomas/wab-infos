import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/attendance-review.tsx';
let text = fs.readFileSync(file, 'utf8');
text = text.replaceAll('</RhFormModal>}', '</RhFormModal>');
fs.writeFileSync(file, text, 'utf8');
console.log('OK');
