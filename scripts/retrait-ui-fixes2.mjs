import fs from 'node:fs';
let a = fs.readFileSync('apps/redaction/src/components/redaction/rh/payout-methods.tsx', 'utf8');
const beforeA = a;
a = a.replace(/(  return \(\r?\n    <div className="space-y-4">\r?\n)/, `$1      <button type="button" onClick={() => window.dispatchEvent(new Event('rh-open-withdraw'))} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground sm:w-auto">Retirer de l'argent</button>\n`);
fs.writeFileSync('apps/redaction/src/components/redaction/rh/payout-methods.tsx', a, 'utf8');
console.log('PAYOUT_BUTTON', a === beforeA ? 'MISS' : 'OK');

let b = fs.readFileSync('apps/redaction/src/components/redaction/rh/my-withdrawals.tsx', 'utf8');
const beforeB = b;
b = b.replace(/<p className="mt-1 text-sm text-muted-foreground">\s*Chaque demande[\s\S]*?<\/p>\s*/, '');
fs.writeFileSync('apps/redaction/src/components/redaction/rh/my-withdrawals.tsx', b, 'utf8');
console.log('REMOVE_HISTORY_COMMENT', b === beforeB ? 'MISS' : 'OK');
