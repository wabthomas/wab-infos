import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-rh-dashboard.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const h2 = lines.findIndex(line => line.includes('<WalletCards className="h-4 w-4" /> Mes soldes'));
if (h2 < 0) { console.log('MISS_H2'); process.exit(1); }
lines.splice(h2 + 2, 0,
  '            <button type="button" onClick={() => setShowBalances((value) => !value)} aria-pressed={!showBalances} aria-label={showBalances ? \'Masquer les soldes\' : \'Afficher les soldes\'} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground">',
  '              {showBalances ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}<span className="hidden sm:inline">{showBalances ? \'Masquer\' : \'Afficher\'}</span>',
  '            </button>',
);
const amount = lines.findIndex(line => line.includes('{available}</p>'));
if (amount >= 0) lines[amount] = lines[amount].replace('{available}</p>', '{balance.available === null ? \'Non établi\' : showBalances ? available : \'••••••\'}</p>');
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('BALANCE', lines.some(line => line.includes('setShowBalances')) && lines.some(line => line.includes('••••••')) ? 'OK' : 'MISS');
