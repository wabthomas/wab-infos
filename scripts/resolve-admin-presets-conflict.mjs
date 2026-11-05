import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/official-documents.tsx';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  /<<<<<<< HEAD\r?\nconst assetKeys = \[[^\]]*\];\r?\n=======\r?\nconst administrativeCategories[\s\S]*?const assetKeys = \[[^\]]*\];\r?\n>>>>>>> origin\/arena\/560e4c63-wab-infos\r?\n/,
  `const administrativeCategories = [...new Set(ADMINISTRATIVE_PRESETS.map(item => item.category))];
const assetKeys = ['company-logo','document-header','document-footer','director-signature','company-seal','rh-seal'] as const;
`,
);
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('<<<<<<<') ? 'STILL' : 'RESOLVED');
