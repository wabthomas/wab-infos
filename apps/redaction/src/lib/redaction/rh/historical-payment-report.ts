import 'server-only';
import { db } from './database';
import { groupedSql, detailsSql, eventsSql } from './historical-payment-report-sql';
import { isValidDate, isUuid, kinshasaToday } from './activities';

export interface PaymentReportFilter { start: string; end: string; team: string | null; collaboratorId: string | null }
export function parsePaymentReportFilter(params: URLSearchParams): PaymentReportFilter | null {
  const start = params.get('start'), end = params.get('end');
  const team = (params.get('team') ?? '').trim();
  const collaboratorId = params.get('collaboratorId');
  if (!isValidDate(start) || !isValidDate(end) || start > end || end > kinshasaToday() || team.length > 150 || /[\u0000-\u001f\u007f]/.test(team) || (collaboratorId && !isUuid(collaboratorId))) return null;
  return { start, end, team: team || null, collaboratorId };
}

export interface PaymentMonth {
  month: string; collaboratorId: string; firstName: string; lastName: string; team: string; currency: 'CDF'|'USD';
  recordedMinor: string; verifiedHistoricalMinor: string; pendingMinor: string; matchedCount: number;
}
export function aggregatePaymentTotals(rows: PaymentMonth[], key: 'year' | 'month') {
  const totals = new Map<string,{ period: string; currency: 'CDF'|'USD'; recordedMinor: bigint; verifiedHistoricalMinor: bigint; pendingMinor: bigint; matchedCount: number }>();
  for (const row of rows) {
    const period = key === 'year' ? row.month.slice(0,4) : row.month;
    const id = `${period}:${row.currency}`;
    const total = totals.get(id) ?? { period, currency: row.currency, recordedMinor: BigInt(0), verifiedHistoricalMinor: BigInt(0), pendingMinor: BigInt(0), matchedCount: 0 };
    total.recordedMinor += BigInt(row.recordedMinor);
    total.verifiedHistoricalMinor += BigInt(row.verifiedHistoricalMinor);
    total.pendingMinor += BigInt(row.pendingMinor);
    total.matchedCount += row.matchedCount;
    totals.set(id,total);
  }
  return [...totals.values()].sort((a,b)=>a.period.localeCompare(b.period) || a.currency.localeCompare(b.currency)).map((row)=>({
    ...row,recordedMinor:row.recordedMinor.toString(),verifiedHistoricalMinor:row.verifiedHistoricalMinor.toString(),
    pendingMinor:row.pendingMinor.toString(),totalVerifiedMinor:(row.recordedMinor+row.verifiedHistoricalMinor).toString(),
  }));
}

export async function getPaymentReport(filter: PaymentReportFilter, exportMode?: 'summary'|'detail'|'events', actor?: string): Promise<{ monthly: ReturnType<typeof aggregatePaymentTotals>; yearly: ReturnType<typeof aggregatePaymentTotals>; rows: PaymentMonth[]; detail?: unknown[][]; events?: unknown[][] } | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    const values = [filter.start,filter.end,filter.team,filter.collaboratorId];
    const grouped = await client.query(groupedSql,values);
    if (grouped.rows.length > 5000) { await client.query('ROLLBACK'); return null; }
    const rows = grouped.rows as PaymentMonth[];
    let detail: unknown[][] | undefined;
    let events: unknown[][] | undefined;
    if (exportMode === 'detail') {
      const result = await client.query({text:detailsSql,values,rowMode:'array'});
      if (result.rows.length > 5000) { await client.query('ROLLBACK'); return null; }
      detail = result.rows;
    }
    if (exportMode === 'events') {
      const result = await client.query({text:eventsSql,values,rowMode:'array'});
      if (result.rows.length > 5000) { await client.query('ROLLBACK'); return null; }
      events = result.rows;
    }
    if (exportMode && actor) await client.query(`INSERT INTO redaction_rh.historical_payment_report_audit(actor_email,from_date,through_date,report_format,row_count) VALUES($1,$2,$3,$4,$5)`,[actor,filter.start,filter.end,exportMode,exportMode==='detail'?detail?.length??0:exportMode==='events'?events?.length??0:rows.length]);
    await client.query('COMMIT');
    return { monthly:aggregatePaymentTotals(rows,'month'),yearly:aggregatePaymentTotals(rows,'year'),rows,detail,events };
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
