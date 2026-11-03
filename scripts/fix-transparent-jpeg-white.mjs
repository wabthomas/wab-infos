import fs from 'node:fs';
function patch(file, anchor) {
  let text = fs.readFileSync(file, 'utf8');
  const before = text;
  text = text.replace(anchor, "$1context.fillStyle = '#fff';\n      context.fillRect(0, 0, canvas.width, canvas.height);\n      context.drawImage(image, 0, 0);");
  fs.writeFileSync(file, text, 'utf8');
  console.log(file, text === before ? 'MISS' : 'OK');
}
patch('apps/redaction/src/components/redaction/rh/payment-receipt.tsx', /(const context = canvas\.getContext\('2d'\);\r?\n      if \(!context\) return resolve\(null\);\r?\n)(      context\.drawImage\(image, 0, 0\);)/);
patch('apps/redaction/src/components/redaction/rh/employee-id-card.tsx', /(const context = canvas\.getContext\('2d'\);\r?\n      if \(!context\) return resolve\(null\);\r?\n)(      context\.drawImage\(image, 0, 0\);)/);
