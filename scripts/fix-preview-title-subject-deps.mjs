import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/official-documents.tsx';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  '}, [kind, subject, body, recipient, date, signed, signatureMode, settings, assets, issued]);',
  '}, [kind, subject, body, recipient, date, signed, signatureMode, settings, assets, issued, documentTitle, showTitle, showSubject]);',
);
text = text.replace(
  'draftKeyRef.current = JSON.stringify([kind, subject, body, recipient, date, signed, signatureMode, settings, assets, referenceCode]);',
  'draftKeyRef.current = JSON.stringify([kind, subject, body, recipient, date, signed, signatureMode, settings, assets, referenceCode, documentTitle, showTitle, showSubject]);',
);
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('documentTitle, showTitle, showSubject]') ? 'OK' : 'MISS');
