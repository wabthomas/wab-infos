export const MAX_CONTRACT_CLAUSES = 15_000;
export type ContractKind = 'CDD' | 'CDI';
export type ContractDisplayOptions = { job: boolean; location: boolean; startDate: boolean; endDate: boolean; salary: boolean };
export const DEFAULT_CONTRACT_DISPLAY: ContractDisplayOptions = { job: true, location: true, startDate: true, endDate: true, salary: true };
export type ContractInput = { collaboratorId: string; kind: ContractKind; jobTitle: string; workLocation: string; startDate: string; endDate: string | null; salary: string; currency: 'CDF' | 'USD'; clauses: string; birthPlace: string; signaturePlace: string; signatureDate: string | null; displayOptions: ContractDisplayOptions };
const uuid = (s: unknown): s is string => typeof s === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(s);
function date(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0,10) === s;
}
export function validateContractInput(raw: unknown): ContractInput | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const v = raw as Record<string,unknown>;
  if (!uuid(v.collaboratorId) || (v.kind !== 'CDD' && v.kind !== 'CDI') || !date(v.startDate)) return null;
  if (v.kind === 'CDD' ? !date(v.endDate) || v.endDate <= v.startDate : v.endDate !== null && v.endDate !== '') return null;
  if (v.currency !== 'CDF' && v.currency !== 'USD') return null;
  if (typeof v.salary !== 'string' || !/^(?:[1-9]\d{0,11})(?:[.,]\d{1,2})?$/.test(v.salary)) return null;
  for (const [key, max] of [['jobTitle',160],['workLocation',180],['clauses',MAX_CONTRACT_CLAUSES]] as const) {
    if (typeof v[key] !== 'string' || !v[key].trim() || v[key].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v[key])) return null;
  }
  if ((v.clauses as string).split('\n').length > 250) return null;
  const birthPlace = v.birthPlace === undefined ? '' : v.birthPlace;
  if (typeof birthPlace !== 'string' || birthPlace.length > 120 || /[\u0000-\u001f\u007f]/.test(birthPlace)) return null;
  const signaturePlace = v.signaturePlace === undefined ? '' : v.signaturePlace;
  const signatureDate = v.signatureDate === undefined || v.signatureDate === '' ? null : v.signatureDate;
  if (typeof signaturePlace !== 'string' || signaturePlace.length > 120 || /[\u0000-\u001f\u007f]/.test(signaturePlace)
    || (signatureDate !== null && !date(signatureDate))) return null;
  const rawDisplay = v.displayOptions;
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
  return { collaboratorId:v.collaboratorId,kind:v.kind,jobTitle:(v.jobTitle as string).trim(),workLocation:(v.workLocation as string).trim(),startDate:v.startDate,endDate:v.kind==='CDD' ? v.endDate as string : null,salary:v.salary.replace(',','.'),currency:v.currency,clauses:(v.clauses as string).trim(),birthPlace:birthPlace.trim(),signaturePlace:signaturePlace.trim(),signatureDate,displayOptions };
}
export { uuid as isContractId, date as isContractDate };
