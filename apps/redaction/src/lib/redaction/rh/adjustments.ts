import { isUuid } from './activities';
import { parseMonthlyAmount, type RhCurrency } from './money';
export type AdjustmentDirection = 'credit' | 'debit';
export interface AdjustmentInput { collaboratorId: string; currency: RhCurrency; direction: AdjustmentDirection; amountMinor: string; reason: string }
export interface Adjustment { id: string; currency: RhCurrency; direction: AdjustmentDirection; amountMinor: string; reason: string; status: 'draft' | 'validated' | 'cancelled'; version: number; createdAt: string; validatedAt: string | null }
export function validateAdjustment(value: unknown): AdjustmentInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!isUuid(v.collaboratorId) || (v.currency !== 'CDF' && v.currency !== 'USD') || (v.direction !== 'credit' && v.direction !== 'debit') || typeof v.amount !== 'string' || typeof v.reason !== 'string') return null;
  const amount = parseMonthlyAmount(v.amount); const reason = v.reason.trim();
  if (amount === null || amount <= BigInt(0) || !reason || reason.length > 500 || /[\u0000-\u001f\u007f]/.test(reason)) return null;
  return { collaboratorId: v.collaboratorId, currency: v.currency, direction: v.direction, amountMinor: amount.toString(), reason };
}
/** Montants exacts en centièmes ; une absence d'ouverture ne permet pas de solde. */
export function availableAfterAdjustment(balance: { opening: string | null; validated: string; adjustmentCredits: string; adjustmentDebits: string; reserved: string; paid: string }, direction?: AdjustmentDirection, amountMinor?: string): bigint | null {
  if (balance.opening === null) return null;
  let available = BigInt(balance.opening) + BigInt(balance.validated) + BigInt(balance.adjustmentCredits) - BigInt(balance.adjustmentDebits) - BigInt(balance.reserved) - BigInt(balance.paid);
  if (available < BigInt(0)) throw new RangeError('Solde incohérent');
  if (direction && amountMinor !== undefined) {
    const amount = BigInt(amountMinor);
    if (amount <= BigInt(0)) throw new RangeError('Montant invalide');
    available += direction === 'credit' ? amount : -amount;
  }
  return available;
}
