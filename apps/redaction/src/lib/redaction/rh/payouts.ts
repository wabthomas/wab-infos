import { isUuid } from './activities';
import type { RhCurrency } from './money';

export type PayoutKind = 'mobile_money' | 'bank';
export type PayoutProvider = { value: string; label: string; color: string; short: string };

export const MOBILE_MONEY_PROVIDERS: PayoutProvider[] = [
  { value: 'airtel', label: 'Airtel Money', color: '#E40000', short: 'AM' },
  { value: 'mpesa', label: 'M-Pesa (Vodacom)', color: '#00A651', short: 'MP' },
  { value: 'orange', label: 'Orange Money', color: '#FF7900', short: 'OM' },
  { value: 'africell', label: 'Africell Money', color: '#0057B8', short: 'AF' },
  { value: 'autre', label: 'Autre opérateur', color: '#6B7280', short: 'MO' },
];

export const BANK_PROVIDERS: PayoutProvider[] = [
  { value: 'rawbank', label: 'Rawbank', color: '#003A70', short: 'RB' },
  { value: 'equity', label: 'Equity BCDC', color: '#B71C1C', short: 'EQ' },
  { value: 'tmb', label: 'TMB', color: '#0D47A1', short: 'TM' },
  { value: 'fbn', label: 'FBNBank', color: '#1B5E20', short: 'FB' },
  { value: 'access', label: 'Access Bank', color: '#F57C00', short: 'AC' },
  { value: 'standard', label: 'Standard Bank', color: '#1565C0', short: 'SB' },
  { value: 'autre', label: 'Autre banque', color: '#6B7280', short: 'BA' },
];

export function providersFor(kind: PayoutKind): PayoutProvider[] {
  return kind === 'bank' ? BANK_PROVIDERS : MOBILE_MONEY_PROVIDERS;
}

export function providerLabel(kind: PayoutKind, value: string): string {
  return providersFor(kind).find((entry) => entry.value === value)?.label ?? value;
}

export function providerColor(kind: PayoutKind, value: string): string {
  return providersFor(kind).find((entry) => entry.value === value)?.color ?? '#6B7280';
}

export function providerShort(kind: PayoutKind, value: string): string {
  return providersFor(kind).find((entry) => entry.value === value)?.short ?? '?';
}

export interface PayoutMethodInput {
  kind: PayoutKind;
  provider: string;
  accountName: string;
  accountNumber: string;
  currency: RhCurrency;
}

export function validatePayoutMethod(value: unknown): PayoutMethodInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.kind !== 'mobile_money' && raw.kind !== 'bank') return null;
  const kind = raw.kind;
  if (raw.currency !== 'CDF' && raw.currency !== 'USD') return null;
  if (typeof raw.provider !== 'string' || !providersFor(kind).some((entry) => entry.value === raw.provider)) return null;
  const text = (input: unknown, min: number, max: number) => {
    if (typeof input !== 'string') return null;
    const trimmed = input.trim();
    return trimmed.length >= min && trimmed.length <= max && !/[\u0000-\u001f\u007f]/.test(trimmed) ? trimmed : null;
  };
  const accountName = text(raw.accountName, 2, 120);
  const accountNumber = text(raw.accountNumber, 5, 60);
  if (!accountName || !accountNumber) return null;
  if (kind === 'mobile_money') {
    const digits = accountNumber.replace(/[^0-9]/g, '');
    if (digits.length < 8 || digits.length > 15) return null;
  } else if (!/^[0-9A-Za-z .-]{5,60}$/.test(accountNumber)) {
    return null;
  }
  return { kind, provider: raw.provider as string, accountName, accountNumber, currency: raw.currency };
}

export function maskAccount(value: string): string {
  const clean = value.replace(/\s+/g, '');
  if (clean.length <= 4) return '••••';
  return `${'•'.repeat(Math.min(6, clean.length - 4))} ${clean.slice(-4)}`;
}

export interface PayoutMethod extends PayoutMethodInput {
  id: string;
  active: boolean;
  version: number;
  isDefault: boolean;
}

export function isPayoutId(value: unknown): value is string {
  return isUuid(value);
}
