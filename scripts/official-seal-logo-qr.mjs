import fs from 'node:fs';

let exp = fs.readFileSync('apps/redaction/src/lib/redaction/rh/official-export.ts', 'utf8');
const pairs = [
  ["import type { OrganizationSettings } from './organization';", "import type { OrganizationSettings } from './organization';\nimport { createOrganizationQr } from './organization-qr';"],
  ["type Assets = Record<'company-logo' | 'document-header' | 'document-footer' | 'director-signature', string | null>;", "type Assets = Record<'company-logo' | 'document-header' | 'document-footer' | 'director-signature' | 'company-seal', string | null>;"],
  [
    `  const [logo, header, footer, signature] = await Promise.all([
    load(doc.assets['company-logo']), load(doc.assets['document-header']),
    load(doc.assets['document-footer']), load(doc.assets['director-signature']),
  ]);`,
    `  const [logo, header, footer, signature, seal, qrData] = await Promise.all([
    load(doc.assets['company-logo']), load(doc.assets['document-header']),
    load(doc.assets['document-footer']), load(doc.assets['director-signature']),
    load(doc.assets['company-seal'] || null),
    createOrganizationQr(doc.settings).catch(() => null),
  ]);
  const qr = qrData ? await load(qrData) : null;`,
  ],
  ["  image(ctx, logo, left, 42, 96, 67);", "  image(ctx, logo, left, 42, 130, 92);"],
  [
    `  if (layout.signatureY !== null) {
    if (!signature) throw new Error('Image de signature indisponible.');
    image(ctx, signature, right - 170, layout.signatureY, 170, 70);
  }`,
    `  if (layout.signatureY !== null) {
    if (seal) {
      ctx.save();
      ctx.globalAlpha = 0.92;
      image(ctx, seal, right - 136, layout.signatureY + 4, 120, 120);
      ctx.restore();
    }
    if (!signature) throw new Error('Image de signature indisponible.');
    image(ctx, signature, right - 170, layout.signatureY, 170, 70);
  }`,
  ],
  [
    "  image(ctx, footer, left, layout.footerImageY, 680, 42);",
    `  image(ctx, footer, left, layout.footerImageY, 680, 42);
  if (qr) {
    const qrSize = 92;
    const qrX = left;
    const qrY = Math.max(layout.headerBottom + 8, layout.footerTop - qrSize - 10);
    ctx.fillStyle = '#fff';
    ctx.fillRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10);
    image(ctx, qr, qrX, qrY, qrSize, qrSize);
  }`,
  ],
];
for (const [from, to] of pairs) {
  const before = exp;
  exp = exp.split(from).join(to);
  console.log(exp === before ? 'MISS ' + JSON.stringify(from.slice(0, 50)) : 'OK ' + JSON.stringify(from.slice(0, 50)));
}
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/official-export.ts', exp, 'utf8');

let docs = fs.readFileSync('apps/redaction/src/components/redaction/rh/official-documents.tsx', 'utf8');
docs = docs.replace(
  "const assetKeys = ['company-logo','document-header','document-footer','director-signature'] as const;",
  "const assetKeys = ['company-logo','document-header','document-footer','director-signature','company-seal'] as const;",
);
docs = docs.replace(
  "const emptyAssets: Assets = { 'company-logo': null, 'document-header': null, 'document-footer': null, 'director-signature': null };",
  "const emptyAssets: Assets = { 'company-logo': null, 'document-header': null, 'document-footer': null, 'director-signature': null, 'company-seal': null };",
);
fs.writeFileSync('apps/redaction/src/components/redaction/rh/official-documents.tsx', docs, 'utf8');
console.log('DOCS_ASSETS', docs.includes("'company-seal'") ? 'OK' : 'MISS');
