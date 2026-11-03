import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-withdrawals.tsx';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(/<Link href="\/mon-rh\/paiements-anciens"[^>]*>[\s\S]*?<\/Link>/, `<Link href="/mon-rh/paiements-anciens" className="block rounded-xl border border-border bg-card p-4 text-sm font-semibold text-primary underline">Un paiement ancien n'apparaît pas ? Déclarez-le pour vérification</Link>`);
const pairs = [
  ['\u00e2\u00e2\u201a\u00ac\u2122', '\u2019'],
  ['\u00e2\u00e2\u201a\u00ac\u00a6', '\u2026'],
  ['\u00e2\u00e2\u201a\u00ac\u009d', '\u201d'],
  ['\u00e2\u00e2\u201a\u00ac\u009c', '\u201c'],
  ['\u00e2\u00e2\u201a\u00ac', ''],
  ['\u00c3\u00a9', '\u00e9'],
  ['\u00c3\u00a8', '\u00e8'],
  ['\u00c3\u00a0', '\u00e0'],
  ['\u00c3\u00a7', '\u00e7'],
  ['\u00c3\u00a2', '\u00e2'],
  ['\u00c3\u00a9', '\u00e9'],
];
for (let pass = 0; pass < 6; pass += 1) {
  const before = text;
  for (const [from, to] of pairs) text = text.split(from).join(to);
  if (text === before) break;
}
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('paiement ancien') ? text.match(/Un paiement ancien[^<]*/)[0] : 'LINK_MISSING');
