import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/official-export.ts';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  /const \[logo, header, footer, signature\] = await Promise\.all\(\[[\s\S]*?\]\);/,
  `const [logo, header, footer, signature, seal, qrData] = await Promise.all([
    load(doc.assets['company-logo']), load(doc.assets['document-header']),
    load(doc.assets['document-footer']), load(doc.assets['director-signature']),
    load(doc.assets['company-seal'] || null),
    createOrganizationQr(doc.settings).catch(() => null),
  ]);
  const qr = qrData ? await load(qrData) : null;`,
);
text = text.replace(
  /if \(layout\.signatureY !== null\) \{[\s\S]*?image\(ctx, signature, right - 170, layout\.signatureY, 170, 70\);\r?\n  \}/,
  `if (layout.signatureY !== null) {
    if (seal) {
      ctx.save();
      ctx.globalAlpha = 0.92;
      image(ctx, seal, right - 136, layout.signatureY + 4, 120, 120);
      ctx.restore();
    }
    if (!signature) throw new Error('Image de signature indisponible.');
    image(ctx, signature, right - 170, layout.signatureY, 170, 70);
  }`,
);
fs.writeFileSync(file, text, 'utf8');
console.log('PATCHED', text.includes('qrData') && text.includes('globalAlpha') ? 'OK' : 'MISS');
