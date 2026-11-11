import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/chat.tsx';
let text = fs.readFileSync(file, 'utf8');
const needle = '<div role="dialog" aria-modal="true" aria-label="Sélectionner un contact"';
if (!text.includes('paddingBottom: keyboardInset')) {
  text = text.replace(
    /(<div role="dialog" aria-modal="true" aria-label="Sélectionner un contact"[^>]*?)(>)/,
    '$1 style={{ paddingBottom: keyboardInset }}$2',
  );
}
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('paddingBottom: keyboardInset') ? 'OK' : 'MISS');
