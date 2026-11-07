import fs from 'node:fs';
const eolFor = (t) => t.includes('\r\n') ? '\r\n' : '\n';

// 1) Projection contrats : union des deux colonnes.
let r = 'apps/redaction/src/app/api/redaction/rh/contrats/route.ts';
let rt = fs.readFileSync(r, 'utf8');
rt = rt.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> origin\/arena\/560e4c63-wab-infos\r?\n/g, (_m, ours, theirs) => {
  const line = theirs.replace('k.employee_signature AS "employeeSignature"', 'k.employee_signature AS "employeeSignature",k.display_options AS "displayOptions"');
  return line;
});
fs.writeFileSync(r, rt, 'utf8');
console.log('ROUTE', !rt.includes('<<<<<<<') ? 'OK' : 'STILL');

// 2) PDF : version Arena + displayOptions.
let p = 'apps/redaction/src/app/api/redaction/rh/contrats/[id]/pdf/route.ts';
let pt = fs.readFileSync(p, 'utf8');
pt = pt.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> origin\/arena\/560e4c63-wab-infos\r?\n/g, (_m, ours, theirs) =>
  theirs.replace('parties:row.party_snapshot,employer:', 'parties:row.party_snapshot,displayOptions:row.display_options ?? undefined,employer:'),
);
fs.writeFileSync(p, pt, 'utf8');
console.log('PDF', !pt.includes('<<<<<<<') ? 'OK' : 'STILL');

// 3) Type ContractCase : union.
let w = 'apps/redaction/src/components/redaction/rh/contracts-workspace.tsx';
let wt = fs.readFileSync(w, 'utf8');
wt = wt.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> origin\/arena\/560e4c63-wab-infos\r?\n/g, (_m, ours, theirs) =>
  theirs.replace('acceptedAt:string|null };', 'acceptedAt:string|null; displayOptions?:Partial<ContractDisplayOptions>|null };'),
);
fs.writeFileSync(w, wt, 'utf8');
console.log('WORKSPACE', !wt.includes('<<<<<<<') ? 'OK' : 'STILL');
