import type { NextRequest } from 'next/server';
import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { db } from '@/lib/redaction/rh/database';
import { handleError, json } from '@/lib/redaction/rh/api';
import { AUDIT_PAGE_SIZE, parseAuditPage } from '@/lib/redaction/rh/audit-pagination';
import { auditCountSql, auditPageSql } from '@/lib/redaction/rh/audit-query';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await requireRhPermission('access_manage');
    const query = parseAuditPage(request.nextUrl.searchParams);
    if (!query) return json({ error: 'Page ou référence invalide.' }, 400);
    const client = await db().connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const snapshot = query.snapshot ?? String((await client.query(
        'SELECT COALESCE(MAX(id), 0)::text AS id FROM redaction_rh.audit_log',
      )).rows[0].id);
      const count = await client.query(auditCountSql, [snapshot]);
      const page = await client.query(auditPageSql, [snapshot, AUDIT_PAGE_SIZE, query.offset]);
      await client.query('COMMIT');
      return json({ rows: page.rows, page: query.page, pageSize: AUDIT_PAGE_SIZE,
        total: Number(count.rows[0].total), snapshot });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return handleError(error);
  }
}
