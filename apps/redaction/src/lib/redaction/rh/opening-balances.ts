import { isUuid, isValidMonth } from './activities';
import { parseMonthlyAmount, type RhCurrency } from './money';
export interface OpeningBalanceInput { collaboratorId: string; currency: RhCurrency; throughMonth: string; amountMinor: string }
export function validateOpeningBalance(value: unknown, currentMonth: string): OpeningBalanceInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !isValidMonth(currentMonth)) return null;
  const v = value as Record<string, unknown>;
  if (!isUuid(v.collaboratorId) || (v.currency !== 'CDF' && v.currency !== 'USD') || !isValidMonth(v.throughMonth) || v.throughMonth > currentMonth || typeof v.amount !== 'string' || v.confirmed !== true) return null;
  const amount = parseMonthlyAmount(v.amount);
  if (amount === null) return null;
  return { collaboratorId: v.collaboratorId, currency: v.currency, throughMonth: v.throughMonth, amountMinor: amount.toString() };
}
