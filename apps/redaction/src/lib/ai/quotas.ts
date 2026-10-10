type QuotaKind = 'reformulate' | 'publish' | 'research';

const counters = new Map<string, number>();

function dayKey(kind: QuotaKind): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${day}:${kind}`;
}

export function getAiQuotaUsed(kind: QuotaKind): number {
  return counters.get(dayKey(kind)) ?? 0;
}

export function consumeAiQuota(kind: QuotaKind, limit: number): boolean {
  const key = dayKey(kind);
  const used = counters.get(key) ?? 0;
  if (used >= limit) return false;
  counters.set(key, used + 1);
  return true;
}

export function peekAiQuota(kind: QuotaKind, limit: number): {
  used: number;
  limit: number;
  remaining: number;
} {
  const used = getAiQuotaUsed(kind);
  return { used, limit, remaining: Math.max(0, limit - used) };
}
