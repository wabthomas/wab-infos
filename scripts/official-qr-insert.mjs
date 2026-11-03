import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/official-export.ts';
let text = fs.readFileSync(file, 'utf8');
const block = `  if (qr) {
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
`;
if (!text.includes('qrSize = 104')) text = text.replace('  return canvas;', block + '  return canvas;');
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('qrSize = 104') ? 'OK' : 'MISS');
