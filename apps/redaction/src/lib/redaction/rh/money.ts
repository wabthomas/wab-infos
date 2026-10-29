/** Calculs indicatifs uniquement : aucune règle légale ni écriture de paie. */
export type RhCurrency = 'CDF' | 'USD';

// Convention technique provisoire, à valider avant toute mise en production financière.
const SCALE = 100;
const MAX_WHOLE_DIGITS = 15;

/** Convertit un montant décimal non négatif en centièmes exacts, sans flottants. */
export function parseMonthlyAmount(input: string): bigint | null {
  const value = input.trim().replace(',', '.');
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match || match[1].length > MAX_WHOLE_DIGITS) return null;
  return BigInt(match[1]) * BigInt(SCALE) + BigInt((match[2] ?? '').padEnd(2, '0'));
}

/** Division arrondie au centième le plus proche, avec demi-centième arrondi au-dessus. */
export function dailyReference(monthlyMinor: bigint, expectedDays: number): bigint {
  if (monthlyMinor < BigInt(0) || !Number.isSafeInteger(expectedDays) || expectedDays < 1) {
    throw new RangeError('Montant ou nombre de jours invalide');
  }
  const divisor = BigInt(expectedDays);
  return (monthlyMinor + divisor / BigInt(2)) / divisor;
}

export function formatMinorUnits(minor: bigint, currency: RhCurrency): string {
  if (minor < BigInt(0) || (currency !== 'CDF' && currency !== 'USD')) {
    throw new RangeError('Montant ou devise invalide');
  }
  const units = minor / BigInt(SCALE);
  const cents = (minor % BigInt(SCALE)).toString().padStart(2, '0');
  return `${units.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f')},${cents} ${currency}`;
}
