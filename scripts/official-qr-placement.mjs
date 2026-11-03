import fs from 'node:fs';
let exp = fs.readFileSync('apps/redaction/src/lib/redaction/rh/official-export.ts', 'utf8');
exp = exp.replace(/  if \(qr\) \{\r?\n    const qrSize = 92;[\s\S]*?\r?\n  \}\r?\n/, '');
exp = exp.replace(
  /  return canvas;\n\}/,
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
console.log('QR_PLACEMENT', exp.includes('qrSize = 104') && !exp.includes('qrSize = 92') ? 'OK' : 'MISS');

let qr = fs.readFileSync('apps/redaction/src/lib/redaction/rh/organization-qr.ts', 'utf8');
qr = qr.replace('margin: 1,', 'margin: 4,');
qr = qr.replace("color: { dark: '#191923', light: '#ffffff' }", "color: { dark: '#000000', light: '#ffffff' }");
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/organization-qr.ts', qr, 'utf8');
console.log('QR_SETTINGS', qr.includes('margin: 4') && qr.includes("#000000") ? 'OK' : 'MISS');
