import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/official-export.ts';
let text = fs.readFileSync(file, 'utf8');
const pairs = [
  [/setFont\(ctx, 11\);(\r?\n  const headerText)/, 'setFont(ctx, 13);$1'],
  [/setFont\(ctx, 18, true\);(\r?\n  const nameLines)/, 'setFont(ctx, 21, true);$1'],
  [/setFont\(ctx, 11\);(\r?\n  const headerLines)/, 'setFont(ctx, 13);$1'],
  [/setFont\(ctx, 10\);(\r?\n  const footerLines)/, 'setFont(ctx, 12);$1'],
  [/setFont\(ctx, 12\);(\r?\n      const titles = wrap)/, 'setFont(ctx, 14);$1'],
];
for (const [re, to] of pairs) {
  const before = text;
  text = text.replace(re, to);
  console.log(text === before ? 'MISS' : 'OK');
}
fs.writeFileSync(file, text, 'utf8');
