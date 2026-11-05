import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/official-documents.tsx';
let text = fs.readFileSync(file, 'utf8');
const eol = text.includes('\r\n') ? '\r\n' : '\n';
const lines = text.split(/\r?\n/);
const start = lines.findIndex(l => l.startsWith('<<<<<<< HEAD'));
const end = lines.findIndex(l => l.startsWith('>>>>>>> origin/arena/560e4c63-wab-infos'));
if (start >= 0 && end > start) {
  lines.splice(start, end - start + 1,
    "const administrativeCategories = [...new Set(ADMINISTRATIVE_PRESETS.map(item => item.category))];",
    "const assetKeys = ['company-logo','document-header','document-footer','director-signature','company-seal','rh-seal'] as const;",
  );
}
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log(lines.some(l => l.startsWith('<<<<<<<')) ? 'STILL' : 'RESOLVED');
