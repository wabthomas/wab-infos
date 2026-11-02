import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { listAuditLog } from '@/lib/redaction/rh/database';
import { handleError, json } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRhPermission('team_read');
    return json({ entries: await listAuditLog() });
  } catch (error) {
    return handleError(error);
  }
}