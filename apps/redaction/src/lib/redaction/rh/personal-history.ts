import { isValidMonth, kinshasaToday } from './activities';

export type HistoryPeriod = 'recent' | 'all' | 'month' | 'year';
export interface HistoryQuery {
  period: HistoryPeriod;
  from: string | null;
  to: string | null;
  limit: number;
  offset: number;
}

export function parseHistoryQuery(url: string, now = new Date()): HistoryQuery | null {
  const params = new URL(url).searchParams;
  const period = params.get('period') ?? 'recent';
  if (!['recent', 'all', 'month', 'year'].includes(period)) return null;
  const value = params.get('value');
  const pageRaw = params.get('page') ?? '1';
  if (!/^[1-9]\d{0,5}$/.test(pageRaw)) return null;
  const page = Number(pageRaw);
  if (page > 10000 || (period === 'recent' && page !== 1)) return null;
  let from: string | null = null;
  let to: string | null = null;
  if (period === 'month') {
    if (!isValidMonth(value) || value > '2099-12') return null;
    const [year, month] = value.split('-').map(Number);
    from = `${value}-01`;
    to = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  } else if (period === 'year') {
    if (typeof value !== 'string' || !/^(19\d\d|20\d\d)$/.test(value)) return null;
    from = `${value}-01-01`;
    to = `${Number(value) + 1}-01-01`;
  } else if (value !== null) return null;
  if (period === 'recent') {
    const day = new Date(`${kinshasaToday(now)}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
    from = day.toISOString().slice(0, 10);
  }
  const limit = period === 'recent' ? 6 : 30;
  return { period: period as HistoryPeriod, from, to, limit, offset: (page - 1) * limit };
}

export function historyUrl(endpoint: string, period: HistoryPeriod, value = '', page = 1): string {
  const params = new URLSearchParams({ period, page: String(page) });
  if (period === 'month' || period === 'year') params.set('value', value);
  return `${endpoint}?${params}`;
}
