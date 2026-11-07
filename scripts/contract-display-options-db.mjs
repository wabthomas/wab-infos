import fs from 'node:fs';

// --- contracts.ts : options d'affichage validées ---
let c = fs.readFileSync('apps/redaction/src/lib/redaction/rh/contracts.ts', 'utf8');
c = c.replace(
  "export type ContractInput = { collaboratorId: string; kind: ContractKind; jobTitle: string; workLocation: string; startDate: string; endDate: string | null; salary: string; currency: 'CDF' | 'USD'; clauses: string; birthPlace: string; signaturePlace: string; signatureDate: string | null };",
  `export type ContractDisplayOptions = { job: boolean; location: boolean; startDate: boolean; endDate: boolean; salary: boolean };
export const DEFAULT_CONTRACT_DISPLAY: ContractDisplayOptions = { job: true, location: true, startDate: true, endDate: true, salary: true };
export type ContractInput = { collaboratorId: string; kind: ContractKind; jobTitle: string; workLocation: string; startDate: string; endDate: string | null; salary: string; currency: 'CDF' | 'USD'; clauses: string; birthPlace: string; signaturePlace: string; signatureDate: string | null; displayOptions: ContractDisplayOptions };`,
);
c = c.replace(
  "  return { collaboratorId:v.collaboratorId,kind:v.kind",
  `  const rawDisplay = v.displayOptions;
  const displayOptions: ContractDisplayOptions = { ...DEFAULT_CONTRACT_DISPLAY };
  if (rawDisplay !== undefined) {
    if (!rawDisplay || typeof rawDisplay !== 'object' || Array.isArray(rawDisplay)) return null;
    for (const key of Object.keys(DEFAULT_CONTRACT_DISPLAY) as (keyof ContractDisplayOptions)[]) {
      const value = (rawDisplay as Record<string, unknown>)[key];
      if (value === undefined) continue;
      if (typeof value !== 'boolean') return null;
      displayOptions[key] = value;
    }
  }
  return { collaboratorId:v.collaboratorId,kind:v.kind`,
);
c = c.replace(
  ",signatureDate };",
  ",signatureDate,displayOptions };",
);
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/contracts.ts', c, 'utf8');
console.log('CONTRACTS', c.includes('displayOptions') ? 'OK' : 'MISS');

// --- Route contrats : projection + insert/update ---
let r = fs.readFileSync('apps/redaction/src/app/api/redaction/rh/contrats/route.ts', 'utf8');
r = r.replace(
  'k.employee_signature AS "employeeSignature"',
  'k.employee_signature AS "employeeSignature",k.display_options AS "displayOptions"',
);
r = r.replace(
  "clauses,birth_place,signature_place,signature_date,prepared_by)\n        SELECT $1,id,$3,$4,$5,$6,$7,$8,$9,$10,$12,$13,$14,$11 FROM",
  "clauses,birth_place,signature_place,signature_date,display_options,prepared_by)\n        SELECT $1,id,$3,$4,$5,$6,$7,$8,$9,$10,$12,$13,$14,$15,$11 FROM",
);
r = r.replace(
  "input.birthPlace,input.signaturePlace,input.signatureDate]);",
  "input.birthPlace,input.signaturePlace,input.signatureDate,JSON.stringify(input.displayOptions)]);",
);
r = r.replace(
  "signature_place=$11,signature_date=$12,version=version+1",
  "signature_place=$11,signature_date=$12,display_options=$13,version=version+1",
);
r = r.replace(
  "input!.birthPlace,input!.signaturePlace,input!.signatureDate]);",
  "input!.birthPlace,input!.signaturePlace,input!.signatureDate,JSON.stringify(input!.displayOptions)]);",
);
fs.writeFileSync('apps/redaction/src/app/api/redaction/rh/contrats/route.ts', r, 'utf8');
console.log('ROUTE', r.includes('display_options') ? 'OK' : 'MISS');
