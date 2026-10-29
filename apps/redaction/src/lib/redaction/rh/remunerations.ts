import { isUuid, isValidMonth } from './activities';
import { parseMonthlyAmount, type RhCurrency } from './money';

export interface RemunerationInput { collaboratorId: string; month: string; currency: RhCurrency; amountMinor: string }
export interface Remuneration { id: string; month: string; currency: RhCurrency; amountMinor: string; status: 'draft' | 'validated' | 'cancelled'; version: number; validatedAt: string | null }
export function validateRemuneration(value: unknown): RemunerationInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!isUuid(v.collaboratorId) || !isValidMonth(v.month) || (v.currency !== 'CDF' && v.currency !== 'USD') || typeof v.amount !== 'string') return null;
  const amount = parseMonthlyAmount(v.amount);
  if (amount === null) return null;
  return { collaboratorId: v.collaboratorId, month: v.month, currency: v.currency, amountMinor: amount.toString() };
}
