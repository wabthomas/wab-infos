export type OfficialReferenceMode = 'automatic' | 'manual';
export const DEFAULT_OFFICIAL_REFERENCE_MODE: OfficialReferenceMode = 'automatic';
export const DEFAULT_OFFICIAL_REFERENCE_FORMAT = 'COM-RH-{AAAA}-{SEQ:6}';
export const MANUAL_OFFICIAL_REFERENCE_FORMAT = 'COM-RH-{AAAA}-{REF}';

/** Les codes sont configurés par l'admin ; aucun numéro n'est confié au navigateur en mode automatique. */
export function validOfficialReferenceConfig(mode: string, format: string): boolean {
  if (mode !== 'automatic' && mode !== 'manual') return false;
  if (!format || format.length > 64 || /[\u0000-\u001f\u007f]/.test(format)) return false;
  const tokens = format.match(/\{[^{}]*\}/g) ?? [];
  const number = mode === 'automatic' ? /^\{SEQ:([2-9]|10)\}$/ : /^\{REF\}$/;
  if (tokens.filter(token => number.test(token)).length !== 1 || tokens.some(token => !number.test(token) && token !== '{AAAA}' && token !== '{MM}')) return false;
  const literals = format.replace(/\{[^{}]*\}/g, '');
  return !/[{}]/.test(literals) && /^[A-Za-z0-9._\/-]*$/.test(literals);
}

export function validManualReferenceCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$/.test(value);
}

export function formatOfficialReference(mode: OfficialReferenceMode, format: string, date: Date, value: string | number): string {
  if (!validOfficialReferenceConfig(mode, format) || !Number.isFinite(date.valueOf())) throw new Error('Format de référence invalide.');
  if (mode === 'automatic' && (!Number.isSafeInteger(value) || Number(value) < 1)) throw new Error('Compteur invalide.');
  if (mode === 'manual' && !validManualReferenceCode(value)) throw new Error('Code manuel invalide.');
  const parts = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', timeZone: 'Africa/Kinshasa' }).formatToParts(date);
  const year = parts.find(item => item.type === 'year')!.value;
  const month = parts.find(item => item.type === 'month')!.value;
  const output = format.replaceAll('{AAAA}', year).replaceAll('{MM}', month)
    .replace(/\{SEQ:(\d+)\}/, (_, width: string) => String(value).padStart(Number(width), '0'))
    .replace('{REF}', String(value).toUpperCase());
  if (output.length > 80) throw new Error('Référence trop longue.');
  return output.toUpperCase();
}
