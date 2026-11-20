import fs from 'node:fs';
const file = 'apps/redaction/src/components/ui/toast.tsx';
let text = fs.readFileSync(file, 'utf8');
text = text.replace('fixed inset-x-0 top-0 z-[200]', 'fixed inset-x-0 top-0 z-[400]');
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('z-[400]') ? 'TOAST OK' : 'MISS');
