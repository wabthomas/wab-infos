import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-withdrawals.tsx';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  /(\{busy \? 'Envoi\.\.\.' : 'Envoyer la demande'\}\s*<\/button>)/,
  `$1\n        <button type="button" onClick={() => setRequestOpen(false)} disabled={busy} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground disabled:opacity-50">Annuler</button>`,
);
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('>Annuler</button>') ? 'ANNUlER_OK' : 'MISSING');
