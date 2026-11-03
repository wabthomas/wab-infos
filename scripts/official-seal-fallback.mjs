import fs from 'node:fs';
let exp = fs.readFileSync('apps/redaction/src/lib/redaction/rh/official-export.ts', 'utf8');
exp = exp.replace(
  "type Assets = Record<'company-logo' | 'document-header' | 'document-footer' | 'director-signature' | 'company-seal', string | null>;",
  "type Assets = Record<'company-logo' | 'document-header' | 'document-footer' | 'director-signature' | 'company-seal' | 'rh-seal', string | null>;",
);
exp = exp.replace(
  "load(doc.assets['company-seal'] || null),",
  "load(doc.assets['company-seal'] || doc.assets['rh-seal'] || null),",
);
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/official-export.ts', exp, 'utf8');

let docs = fs.readFileSync('apps/redaction/src/components/redaction/rh/official-documents.tsx', 'utf8');
docs = docs.replace(
  "const assetKeys = ['company-logo','document-header','document-footer','director-signature','company-seal'] as const;",
  "const assetKeys = ['company-logo','document-header','document-footer','director-signature','company-seal','rh-seal'] as const;",
);
docs = docs.replace(
  "const emptyAssets: Assets = { 'company-logo': null, 'document-header': null, 'document-footer': null, 'director-signature': null, 'company-seal': null };",
  "const emptyAssets: Assets = { 'company-logo': null, 'document-header': null, 'document-footer': null, 'director-signature': null, 'company-seal': null, 'rh-seal': null };",
);
fs.writeFileSync('apps/redaction/src/components/redaction/rh/official-documents.tsx', docs, 'utf8');
console.log(exp.includes("doc.assets['rh-seal']") && docs.includes("'rh-seal'") ? 'SEAL_FALLBACK_OK' : 'MISS');
