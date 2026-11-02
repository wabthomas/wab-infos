export function offlineRecordedAt(value: unknown, now = Date.now()): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value || date.getTime() > now + 5 * 60_000 || date.getTime() < now - 30 * 86400_000) return null;
  return date;
}
