import { isValidDate } from './activities';
export type ReportType = 'collaborateurs' | 'absences' | 'prestations' | 'presence';
export interface ReportFilter { type: ReportType; start: string | null; end: string | null; team: string | null }
export const REPORT_LIMIT = 5000;

export function parseReportFilter(params: URLSearchParams): ReportFilter | null {
  const type = params.get('type');
  if (type !== 'collaborateurs' && type !== 'absences' && type !== 'prestations' && type !== 'presence') return null;
  const team = (params.get('team') ?? '').trim();
  if (team.length > 150 || /[\u0000-\u001f\u007f]/.test(team)) return null;
  if (type === 'collaborateurs') return { type, start: null, end: null, team: team || null };
  const start = params.get('start'); const end = params.get('end');
  if (!isValidDate(start) || !isValidDate(end) || end < start || (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000 > 365) return null;
  return { type, start, end, team: team || null };
}

/** Protection des cellules CSV avant échappement RFC 4180 pour les tableurs. */
export function csvCell(value: unknown): string {
  let cell = value == null ? '' : String(value);
  if (/^[\s\u0000-\u001f\u007f]*[=+\-@]/u.test(cell) || /^[\t\r\n]/u.test(cell)) cell = `'${cell}`;
  return `"${cell.replace(/"/g, '""')}"`;
}
export function makeCsv(headers: string[], rows: unknown[][]): string {
  return '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
