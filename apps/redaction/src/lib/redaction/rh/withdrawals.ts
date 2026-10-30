import { isUuid, isValidDate } from './activities';
import { parseMonthlyAmount, type RhCurrency } from './money';
export type WithdrawalMethod = 'mobile_money' | 'virement' | 'especes' | 'autre';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'paid';
export type Balance = { currency: RhCurrency; opening: string | null; throughMonth: string | null; validated: string; adjustmentCredits: string; adjustmentDebits: string; reserved: string; paid: string; available: string | null };
export interface Withdrawal { id: string; currency: RhCurrency; amountMinor: string; method: WithdrawalMethod; status: WithdrawalStatus; decisionNote: string; paymentDate: string | null; paymentReference: string | null; payoutMethodId: string | null; payoutLabel: string | null; version: number }
export interface WithdrawalInput { key: string; currency: RhCurrency; amountMinor: string; method: WithdrawalMethod; payoutMethodId?: string }
export function validateWithdrawal(value: unknown): WithdrawalInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!isUuid(v.key) || (v.currency !== 'CDF' && v.currency !== 'USD') || typeof v.amount !== 'string' || !['mobile_money','virement','especes','autre'].includes(String(v.method))) return null;
  if (v.payoutMethodId !== undefined && v.payoutMethodId !== null && !isUuid(v.payoutMethodId)) return null;
  const amount = parseMonthlyAmount(v.amount);
  if (amount === null || amount <= BigInt(0)) return null;
  return { key: v.key, currency: v.currency, amountMinor: amount.toString(), method: v.method as WithdrawalMethod, ...(typeof v.payoutMethodId === 'string' ? { payoutMethodId: v.payoutMethodId } : {}) };
}
export type WithdrawalDecision = { action: 'approve' | 'reject' | 'pay'; note: string; paymentDate: string | null; paymentReference: string | null };
export function validateWithdrawalDecision(value: unknown, today: string): WithdrawalDecision | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !isValidDate(today)) return null;
  const v = value as Record<string, unknown>;
  if (v.action !== 'approve' && v.action !== 'reject' && v.action !== 'pay') return null;
  if (typeof v.note !== 'string') return null;
  const note = v.note.trim();
  if (note.length > 500 || /[\u0000-\u001f\u007f]/.test(note) || (v.action === 'reject' && !note)) return null;
  if (v.action !== 'pay') return { action: v.action, note, paymentDate: null, paymentReference: null };
  if (!isValidDate(v.paymentDate) || v.paymentDate > today || typeof v.paymentReference !== 'string') return null;
  const ref = v.paymentReference.trim();
  if (ref.length > 150 || /[\u0000-\u001f\u007f]/.test(ref)) return null;
  return { action: 'pay', note, paymentDate: v.paymentDate, paymentReference: ref || null };
}

/** Une identité liée vérifiable est requise pour écarter l'auto-traitement. */
export function mayReviewWithdrawal(actor: string, requester: string, linkedEmail: string | null): boolean {
  const normalize = (value: string) => value.trim().toLowerCase();
  return !!linkedEmail && !!normalize(actor) && normalize(actor) !== normalize(requester) && normalize(actor) !== normalize(linkedEmail);
}
