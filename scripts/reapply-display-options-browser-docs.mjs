import fs from 'node:fs';

// 1) readBody : restaurer la limite paramétrable (envoi de PDF par e-mail).
let api = fs.readFileSync('apps/redaction/src/lib/redaction/rh/api.ts', 'utf8');
api = api.replace('export async function readBody(request: Request): Promise<unknown> {', 'export async function readBody(request: Request, maxBytes = 8192): Promise<unknown> {');
api = api.replace('if (size > 8192) {', 'if (size > maxBytes) {');
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/api.ts', api, 'utf8');
console.log('API', api.includes('maxBytes = 8192') ? 'OK' : 'MISS');

// 2) PaymentReceipt : prop collaboratorId supprimée par Arena.
let wr = fs.readFileSync('apps/redaction/src/components/redaction/rh/withdrawal-review.tsx', 'utf8');
wr = wr.replace('<PaymentReceipt person={selected} withdrawal={receiptWithdrawal} collaboratorId={person} />', '<PaymentReceipt person={selected} withdrawal={receiptWithdrawal} />');
fs.writeFileSync('apps/redaction/src/components/redaction/rh/withdrawal-review.tsx', wr, 'utf8');
console.log('REVIEW', !wr.includes('collaboratorId={person}') ? 'OK' : 'MISS');

// 3) Contrats : réappliquer les options d'affichage + sceau lisible.
const file = 'apps/redaction/src/components/redaction/rh/contracts-workspace.tsx';
let w = fs.readFileSync(file, 'utf8');
w = w.replace("import { MAX_CONTRACT_CLAUSES } from '@/lib/redaction/rh/contracts';", "import { DEFAULT_CONTRACT_DISPLAY, MAX_CONTRACT_CLAUSES, type ContractDisplayOptions } from '@/lib/redaction/rh/contracts';");
w = w.replace('acceptedAt:string|null };', 'acceptedAt:string|null; displayOptions?:Partial<ContractDisplayOptions>|null };');
w = w.replace(
  "  const [profile, setProfile] = useState<ContractProfile | null>(null);",
  "  const [displayOptions, setDisplayOptions] = useState<ContractDisplayOptions>(DEFAULT_CONTRACT_DISPLAY);\n  const [profile, setProfile] = useState<ContractProfile | null>(null);",
);
w = w.replace(
  "setSelected(item);setPersonId(item.collaboratorId);setKind(item.kind);setJob(item.jobTitle);setLocation(item.workLocation);",
  "setSelected(item);setPersonId(item.collaboratorId);setKind(item.kind);setJob(item.jobTitle);setLocation(item.workLocation);setDisplayOptions({ ...DEFAULT_CONTRACT_DISPLAY, ...(item.displayOptions ?? {}) });",
);
w = w.replace(
  "signatureDate:item.signatureDate || null }));",
  "signatureDate:item.signatureDate || null,displayOptions:{ ...DEFAULT_CONTRACT_DISPLAY, ...(item.displayOptions ?? {}) } }));",
);
w = w.replace(
  "signaturePlace,signatureDate:signatureDate||null }; }",
  "signaturePlace,signatureDate:signatureDate||null,displayOptions }; }",
);
w = w.split("startDate, endDate: kind === 'CDD' ? endDate : null, salary: salary.replace(',', '.'), currency, clauses, parties, signaturePlace, signatureDate,").join(
  "startDate, endDate: kind === 'CDD' ? endDate : null, salary: salary.replace(',', '.'), currency, clauses, parties, signaturePlace, signatureDate, displayOptions,",
);
w = w.split('png(seal, .22)').join('png(seal, .85)');
w = w.replace(
  "authorized, parties?.birthDate, parties?.address, parties?.phone, profileLoading, settings, sign, seal, signature, logo]);",
  "authorized, displayOptions, parties?.birthDate, parties?.address, parties?.phone, profileLoading, settings, sign, seal, signature, logo]);",
);
w = w.replace(
  '<label className="text-sm font-medium">Devise<select className={input} value={currency} onChange={e => { setCurrency(e.target.value as \'CDF\' | \'USD\'); setApproved(false); setSign(false); }}><option>CDF</option><option>USD</option></select></label>',
  `<label className="text-sm font-medium">Devise<select className={input} value={currency} onChange={e => { setCurrency(e.target.value as 'CDF' | 'USD'); setApproved(false); setSign(false); }}><option>CDF</option><option>USD</option></select></label>
              <div className="rounded-lg border bg-muted/30 p-3 sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Afficher sur le contrat</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  {([
                    ['job', 'Fonction'],
                    ['location', 'Lieu d’affectation'],
                    ['startDate', 'Date de prise d’effet'],
                    ['endDate', 'Date de fin'],
                    ['salary', 'Rémunération (montant et devise)'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={displayOptions[key]} onChange={e => { setDisplayOptions(v => ({ ...v, [key]: e.target.checked })); setApproved(false); setSign(false); }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>`,
);
fs.writeFileSync(file, w, 'utf8');
console.log('WORKSPACE', w.includes('Afficher sur le contrat') && w.includes('displayOptions };') ? 'OK' : 'MISS');
