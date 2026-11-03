import fs from 'node:fs';

// 1) QR : payload plus court, contraste noir, marge/quiet zone suffisante.
let qr = fs.readFileSync('apps/redaction/src/lib/redaction/rh/organization-qr.ts', 'utf8');
qr = qr.replace(
  /  const fields: Array<\[string, string\]> = \[[\s\S]*?\];/,
  `  const fields: Array<[string, string]> = [
    ['Entreprise', settings.companyName],
    ['Adresse', settings.companyAddress],
    ['Téléphone', settings.companyPhone],
    ['E-mail', settings.companyEmail],
    ['Site web', settings.companyWebsite],
    ['ID fiscal', settings.companyTaxId],
  ];`,
);
qr = qr.replace(/value\.slice\(0, 150\)/g, 'value.slice(0, 90)');
qr = qr.replace(/errorCorrectionLevel: 'M',\n    margin: 1,\n    width: 512,\n    color: \{ dark: '#191923', light: '#ffffff' \},/, "errorCorrectionLevel: 'M',\n    margin: 4,\n    width: 512,\n    color: { dark: '#000000', light: '#ffffff' },");
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/organization-qr.ts', qr, 'utf8');
console.log('QR', qr.includes('margin: 4') && qr.includes("'Entreprise'") ? 'OK' : 'MISS');

// 2) Rendu officiel : header séparé, signature agrandie sur le sceau, QR réservé.
let exp = fs.readFileSync('apps/redaction/src/lib/redaction/rh/official-export.ts', 'utf8');
exp = exp.replace(
  "const headerX = doc.assets['company-logo'] ? 181 : left;",
  "const headerX = doc.assets['company-logo'] ? 198 : left;",
);
exp = exp.replace(
  "  if (layout.signatureY !== null) {\n    if (seal) {\n      ctx.save();\n      ctx.globalAlpha = 0.92;\n      image(ctx, seal, right - 136, layout.signatureY + 4, 120, 120);\n      ctx.restore();\n    }\n    if (!signature) throw new Error('Image de signature indisponible.');\n    image(ctx, signature, right - 170, layout.signatureY, 170, 70);\n  }",
  "  if (layout.signatureY !== null) {\n    if (seal) {\n      ctx.save();\n      ctx.globalAlpha = 0.92;\n      image(ctx, seal, right - 136, layout.signatureY + 4, 120, 120);\n      ctx.restore();\n    }\n    if (!signature) throw new Error('Image de signature indisponible.');\n    image(ctx, signature, right - 190, layout.signatureY + 34, 190, 92);\n  }",
);
exp = exp.replace(
  "      if (doc.signatureMode === 'image') { signatureY = y; y += 77; }",
  "      if (doc.signatureMode === 'image') { signatureY = y; y += 134; }",
);
// Réserver la zone QR en bas : le corps ne doit pas la chevaucher.
exp = exp.replace('if (y <= footerTop - 18) {', 'if (y <= footerTop - 120) {');
// Retirer l'ancien QR (dessiné avant le texte) pour le redessiner après.
exp = exp.replace(
  /  if \(qr\) \{\n    const qrSize = 92;[\s\S]*?image\(ctx, qr, qrX, qrY, qrSize, qrSize\);\n  \}\n/,
  '',
);
exp = exp.replace(
  '  return canvas;\n}',
  `  if (qr) {
    const qrSize = 104;
    const qrX = left;
    const qrY = layout.footerTop - qrSize - 10;
    ctx.fillStyle = '#fff';
    ctx.fillRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12);
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.strokeRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12);
    image(ctx, qr, qrX, qrY, qrSize, qrSize);
  }
  return canvas;
}`,
);
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/official-export.ts', exp, 'utf8');
console.log('EXPORT', exp.includes('right - 190') && exp.includes('qrSize = 104') ? 'OK' : 'MISS');

// 3) Barre d'outils jamais imprimée.
let docs = fs.readFileSync('apps/redaction/src/components/redaction/rh/official-documents.tsx', 'utf8');
docs = docs.replace(
  '<div className="mt-4 flex flex-wrap items-center gap-2">\n        <button className={button} disabled={!!busy} type="button" onClick={() => void exportFile(\'pdf\')}>',
  '<div data-official-toolbar className="no-print mt-4 flex flex-wrap items-center gap-2">\n        <button className={button} disabled={!!busy} type="button" onClick={() => void exportFile(\'pdf\')}>',
);
docs = docs.replace(
  "body * { visibility: hidden !important; } .official-print-page",
  "body * { visibility: hidden !important; } [data-official-toolbar], .no-print { display: none !important; } .official-print-page",
);
fs.writeFileSync('apps/redaction/src/components/redaction/rh/official-documents.tsx', docs, 'utf8');
console.log('TOOLBAR', docs.includes('data-official-toolbar') ? 'OK' : 'MISS');
