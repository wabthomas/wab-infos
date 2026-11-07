import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/contracts.ts';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  "  if (typeof v.salary !== 'string' || !/^(?:[1-9]\\d{0,11})(?:[.,]\\d{1,2})?$/.test(v.salary)) return null;",
  "  const salary = typeof v.salary === 'string' ? v.salary.replace(/[\\s\\u00a0\\u202f]/g, '').replace(',', '.') : '';\n  if (!/^(?:[1-9]\\d{0,11})(?:\\.\\d{1,2})?$/.test(salary)) return null;",
);
text = text.replace("if ((v.clauses as string).split('\\n').length > 250) return null;", "if ((v.clauses as string).split('\\n').length > 1000) return null;");
text = text.replace("salary:v.salary.replace(',','.')", "salary");
text += `
/** Message précis pour diagnostiquer un contrat refusé par la validation. */
export function contractInputError(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'Données du contrat invalides.';
  const v = raw as Record<string, unknown>;
  if (!uuid(v.collaboratorId)) return 'Sélectionnez un collaborateur valide.';
  if (v.kind !== 'CDD' && v.kind !== 'CDI') return 'Type de contrat invalide (CDD ou CDI).';
  if (!date(v.startDate)) return 'Date de prise d’effet invalide.';
  if (v.kind === 'CDD') {
    if (!date(v.endDate)) return 'Date de fin requise pour un CDD.';
    if ((v.endDate as string) <= (v.startDate as string)) return 'La date de fin doit être après la date de prise d’effet.';
  } else if (v.endDate !== null && v.endDate !== '') return 'Un CDI ne doit pas avoir de date de fin.';
  if (v.currency !== 'CDF' && v.currency !== 'USD') return 'Devise invalide (CDF ou USD).';
  const salary = typeof v.salary === 'string' ? v.salary.replace(/[\\s\\u00a0\\u202f]/g, '').replace(',', '.') : '';
  if (!/^(?:[1-9]\\d{0,11})(?:\\.\\d{1,2})?$/.test(salary)) return 'Rémunération invalide : montant positif attendu (ex. 1 500 000 ou 1200,50).';
  if (typeof v.jobTitle !== 'string' || !v.jobTitle.trim()) return 'La fonction est requise.';
  if (typeof v.workLocation !== 'string' || !v.workLocation.trim()) return 'Le lieu d’affectation est requis.';
  if (typeof v.clauses !== 'string' || !v.clauses.trim()) return 'Le corps du contrat (clauses) est requis.';
  if (v.clauses.length > MAX_CONTRACT_CLAUSES) return \`Les clauses dépassent \${MAX_CONTRACT_CLAUSES} caractères.\`;
  if (v.clauses.split('\\n').length > 1000) return 'Le contrat contient trop de lignes.';
  const signatureDate = v.signatureDate === undefined || v.signatureDate === '' ? null : v.signatureDate;
  if (signatureDate !== null && !date(signatureDate)) return 'Date de signature invalide.';
  return null;
}
`;
fs.writeFileSync(file, text, 'utf8');
console.log('CONTRACTS', text.includes('contractInputError') && text.includes('const salary') ? 'OK' : 'MISS');

let route = fs.readFileSync('apps/redaction/src/app/api/redaction/rh/contrats/route.ts', 'utf8');
route = route.replace("import { validateContractInput, isContractId } from '@/lib/redaction/rh/contracts';", "import { validateContractInput, contractInputError, isContractId } from '@/lib/redaction/rh/contracts';");
route = route.replace("if (!input) return json({ error: 'Vérifiez les champs CDD/CDI, dates, rémunération et clauses.' }, 400);", "if (!input) return json({ error: contractInputError(raw) || 'Vérifiez les champs CDD/CDI, dates, rémunération et clauses.' }, 400);");
route = route.replace("if (!input) return json({ error: 'Vérifiez les champs CDD/CDI, dates, rémunération et clauses.' }, 400);", "if (!input) return json({ error: contractInputError(raw) || 'Vérifiez les champs CDD/CDI, dates, rémunération et clauses.' }, 400);");
fs.writeFileSync('route', '', 'utf8');
fs.writeFileSync('apps/redaction/src/app/api/redaction/rh/contrats/route.ts', route, 'utf8');
console.log('ROUTE', route.includes('contractInputError') ? 'OK' : 'MISS');
