import { isValidDate, isUuid } from './activities';
import { parseMonthlyAmount } from './money';

export const HISTORICAL_PAYMENT_KINDS = ['remuneration', 'prestation', 'prime', 'autre'] as const;
export const HISTORICAL_PAYMENT_METHODS = ['mobile_money', 'virement', 'especes', 'autre'] as const;
export type HistoricalPaymentStatus = 'pending' | 'verified' | 'rejected' | 'cancelled';
export interface HistoricalPayment {
  id: string;
  collaboratorId: string;
  date: string;
  currency: 'CDF' | 'USD';
  amountMinor: string;
  kind: typeof HISTORICAL_PAYMENT_KINDS[number];
  method: typeof HISTORICAL_PAYMENT_METHODS[number];
  reference: string;
  note: string;
  status: HistoricalPaymentStatus;
  version: number;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string;
  verificationSource: string | null;
  matchedWithdrawalId: string | null;
  possibleMatches?: { id: string; reference: string | null }[];
  firstName?: string;
  lastName?: string;
}
export interface HistoricalPaymentInput {
  key: string;
  date: string;
  currency: 'CDF' | 'USD';
  amountMinor: string;
  kind: HistoricalPayment['kind'];
  method: HistoricalPayment['method'];
  reference: string;
  note: string;
}

export function validateHistoricalPayment(value: unknown, today: string, startDate: string | null): HistoricalPaymentInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!isUuid(v.key) || !isValidDate(today) || !isValidDate(v.date) || v.date > today || (startDate && v.date < startDate) ||
    (v.currency !== 'CDF' && v.currency !== 'USD') || typeof v.amount !== 'string' ||
    !HISTORICAL_PAYMENT_KINDS.includes(v.kind as HistoricalPayment['kind']) ||
    !HISTORICAL_PAYMENT_METHODS.includes(v.method as HistoricalPayment['method']) ||
    typeof v.reference !== 'string' || typeof v.note !== 'string') return null;
  const amount = parseMonthlyAmount(v.amount);
  const reference = v.reference.trim();
  const note = v.note.trim();
  if (amount === null || amount <= BigInt(0) || amount > BigInt("99999999999999999") || reference.length > 150 || note.length > 500 ||
    /[\u0000-\u001f\u007f]/.test(reference + note)) return null;
  return { key: v.key, date: v.date, currency: v.currency, amountMinor: amount.toString(), kind: v.kind as HistoricalPayment['kind'], method: v.method as HistoricalPayment['method'], reference, note };
}

export function validateHistoricalReview(value: unknown): { id: string; version: number; action: 'verify' | 'reject'; source: 'receipt' | 'bank' | 'cashbook' | 'other' | null; note: string; matchedWithdrawalId: string | null; confirmDistinct: boolean } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!isUuid(v.id) || !Number.isSafeInteger(v.version) || Number(v.version) < 1 ||
    (v.action !== 'verify' && v.action !== 'reject') || typeof v.note !== 'string') return null;
  const note = v.note.trim();
  if (!note || note.length > 500 || /[\u0000-\u001f\u007f]/.test(note)) return null;
  if (v.action === 'reject') return { id: v.id, version: Number(v.version), action: 'reject', note, source: null, matchedWithdrawalId: null, confirmDistinct: false };
  if (!['receipt', 'bank', 'cashbook', 'other'].includes(String(v.source)) ||
    (v.matchedWithdrawalId !== undefined && v.matchedWithdrawalId !== null && !isUuid(v.matchedWithdrawalId))) return null;
  return { id: v.id, version: Number(v.version), action: 'verify', note, source: v.source as 'receipt' | 'bank' | 'cashbook' | 'other', matchedWithdrawalId: typeof v.matchedWithdrawalId === 'string' ? v.matchedWithdrawalId : null, confirmDistinct: v.confirmDistinct === true };
}
