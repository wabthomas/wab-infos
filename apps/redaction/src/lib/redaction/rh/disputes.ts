import { isUuid } from './activities';
export type DisputeCategory = 'remuneration' | 'prestation' | 'autre';
export type DisputeStatus = 'open' | 'answered' | 'cancelled';
export interface Dispute { id: string; category: DisputeCategory; message: string; status: DisputeStatus; response: string | null; version: number; createdAt: string; resolvedAt: string | null }
export function disputeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= 1000 && !/[\u0000-\u001f\u007f]/.test(text) ? text : null;
}
export function validateDispute(value: unknown): { key: string; category: DisputeCategory; message: string } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!isUuid(v.key) || (v.category !== 'remuneration' && v.category !== 'prestation' && v.category !== 'autre')) return null;
  const message = disputeText(v.message);
  return message ? { key: v.key, category: v.category, message } : null;
}
