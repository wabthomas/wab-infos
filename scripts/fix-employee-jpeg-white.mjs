import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/employee-id-card.tsx';
let text = fs.readFileSync(file, 'utf8');
const before = text;
text = text.replace(
  /(if \(!context\) return resolve\(null\);\r?\n)(\s*)context\.drawImage\(image, 0, 0\);/,
  "$1        context.fillStyle = '#fff';\n        context.fillRect(0, 0, canvas.width, canvas.height);\n        context.drawImage(image, 0, 0);",
);
fs.writeFileSync(file, text, 'utf8');
console.log(text === before ? 'MISS' : 'OK');
