import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/contracts-workspace.tsx';
let text = fs.readFileSync(file, 'utf8');

text = text.replace(
  "import { DEFAULT_ORGANIZATION_SETTINGS, type OrganizationSettings } from '@/lib/redaction/rh/organization';",
  "import { DEFAULT_ORGANIZATION_SETTINGS, type OrganizationSettings } from '@/lib/redaction/rh/organization';\nimport { DEFAULT_CONTRACT_DISPLAY, type ContractDisplayOptions } from '@/lib/redaction/rh/contracts';",
);
text = text.replace(
  "employeeSignature:string|null };",
  "employeeSignature:string|null; displayOptions?:Partial<ContractDisplayOptions>|null };",
);
text = text.replace(
  "  const [profile, setProfile] = useState<ContractProfile | null>(null);",
  "  const [displayOptions, setDisplayOptions] = useState<ContractDisplayOptions>(DEFAULT_CONTRACT_DISPLAY);\n  const [profile, setProfile] = useState<ContractProfile | null>(null);",
);
text = text.replace(
  "setSelected(item);setPersonId(item.collaboratorId);setKind(item.kind);setJob(item.jobTitle);setLocation(item.workLocation);",
  "setSelected(item);setPersonId(item.collaboratorId);setKind(item.kind);setJob(item.jobTitle);setLocation(item.workLocation);setDisplayOptions({ ...DEFAULT_CONTRACT_DISPLAY, ...(item.displayOptions ?? {}) });",
);
text = text.replace(
  "function payload() { return { collaboratorId:personId,kind,jobTitle:job,workLocation:location,startDate,endDate:kind==='CDD'?endDate:null,salary,currency,clauses,birthPlace,signaturePlace,signatureDate:signatureDate||null }; }",
  "function payload() { return { collaboratorId:personId,kind,jobTitle:job,workLocation:location,startDate,endDate:kind==='CDD'?endDate:null,salary,currency,clauses,birthPlace,signaturePlace,signatureDate:signatureDate||null,displayOptions }; }",
);
text = text.split("startDate, endDate: kind === 'CDD' ? endDate : null, salary: salary.replace(',', '.'), currency, clauses, parties, signaturePlace, signatureDate,").join(
  "startDate, endDate: kind === 'CDD' ? endDate : null, salary: salary.replace(',', '.'), currency, clauses, parties, signaturePlace, signatureDate, displayOptions,",
);
text = text.replace(
  "authorized, parties?.birthDate, parties?.address, parties?.phone, profileLoading, settings, sign, seal, signature, logo]);",
  "authorized, displayOptions, parties?.birthDate, parties?.address, parties?.phone, profileLoading, settings, sign, seal, signature, logo]);",
);
text = text.replace(
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
fs.writeFileSync(file, text, 'utf8');
console.log('WORKSPACE', text.includes('Afficher sur le contrat') && text.includes('displayOptions') ? 'OK' : 'MISS');
