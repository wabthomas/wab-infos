export const ACTIVITY_STATUSES = ['effectuee', 'absence_signalee', 'absence_justifiee'] as const;
export type ActivityStatus = typeof ACTIVITY_STATUSES[number];
export interface ActivityInput {
  collaboratorId: string;
  date: string;
  status: ActivityStatus;
  description: string;
}
export interface Activity extends ActivityInput { id: string; version: number }

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01') return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isValidMonth(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && value >= '1900-01';
}

export function kinshasaToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Kinshasa', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}-${parts.find((p) => p.type === 'day')?.value}`;
}

export function validateActivity(value: unknown): ActivityInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  if (!isUuid(obj.collaboratorId) || !isValidDate(obj.date) ||
      typeof obj.status !== 'string' || !ACTIVITY_STATUSES.includes(obj.status as ActivityStatus) ||
      typeof obj.description !== 'string') return null;
  const description = obj.description.trim();
  if (description.length > 500 || /[\u0000-\u001f\u007f]/.test(description)) return null;
  if (obj.status === 'effectuee' && !description) return null;
  return { collaboratorId: obj.collaboratorId, date: obj.date, status: obj.status as ActivityStatus, description };
}

/** Signale seulement les jours attendus passés/présents non documentés depuis l'arrivée connue.
 * Aucune conclusion sur la justification ou les droits n'est tirée. */
export function daysToReview(month: string, today: string, startDate: string | null, recordedDates: string[], approvedAbsences: ReadonlyArray<{ startDate: string; endDate: string }> = []): string[] {
  if (!isValidMonth(month) || !isValidDate(today) || (startDate !== null && !isValidDate(startDate))) throw new RangeError('Date invalide');
  if (!startDate) return []; // Impossible de déterminer si une prestation était attendue.
  const [year, number] = month.split('-').map(Number);
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const recorded = new Set(recordedDates);
  const result: string[] = [];
  for (let day = 1; day <= days; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`;
    if (date <= today && date >= startDate && new Date(Date.UTC(year, number - 1, day)).getUTCDay() !== 0 && !recorded.has(date) && !approvedAbsences.some((absence) => date >= absence.startDate && date <= absence.endDate)) result.push(date);
  }
  return result;
}
