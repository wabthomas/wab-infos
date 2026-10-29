import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { exportRhReport } from '@/lib/redaction/rh/database';
import { makeCsv, parseReportFilter } from '@/lib/redaction/rh/reports';
import { handleError, json, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const user = await requireRhPermission('hr_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    const url = new URL(request.url);
    const filter = parseReportFilter(url.searchParams);
    if (!filter) return json({ error: 'Filtres invalides. Choisissez une période de 366 jours maximum.' }, 400);
    const report = await exportRhReport(filter, user.email);
    if (!report) return json({ error: 'Plus de 5 000 résultats. Réduisez la période ou filtrez par équipe.' }, 413);
    return new Response(makeCsv(report.headers, report.rows), { headers: {
      'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="rh-${filter.type}.csv"`,
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) { return handleError(error); }
}
