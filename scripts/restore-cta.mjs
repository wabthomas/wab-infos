import fs from 'node:fs';

let payout = fs.readFileSync('apps/redaction/src/components/redaction/rh/payout-methods.tsx', 'utf8');
const beforePayout = payout;
payout = payout.replace(/\n      <button type="button" onClick=\{\(\) => window\.dispatchEvent\(new Event\('rh-open-withdraw'\)\)\}[^\n]*\n/, '\n');
fs.writeFileSync('apps/redaction/src/components/redaction/rh/payout-methods.tsx', payout, 'utf8');
console.log('PAYOUT_BUTTON_REMOVED', payout === beforePayout ? 'MISS' : 'OK');

let tx = fs.readFileSync('apps/redaction/src/components/redaction/rh/my-withdrawals.tsx', 'utf8');
const beforeTx = tx;
const cta = `        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setRequestOpen(true)} disabled={available === null} aria-expanded={requestOpen} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#191923] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            <PlusCircle className="h-3.5 w-3.5" /> Retirer de l'argent
          </button>
        </div>
`;
tx = tx.replace(/(        \) : null\}\r?\n)(\s*\r?\n)*(\s*<\/section>)/, `$1${cta}$3`);
fs.writeFileSync('apps/redaction/src/components/redaction/rh/my-withdrawals.tsx', tx, 'utf8');
console.log('CTA_RESTORED', tx === beforeTx ? 'MISS' : 'OK');
