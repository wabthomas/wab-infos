import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { db } from '@/lib/redaction/rh/database';
import { isUuid } from '@/lib/redaction/rh/activities';
import { handleError } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRhPermission('team_read');
    const { id } = await params;
    if (!isUuid(id)) return new Response(null, { status: 400 });
    const result = await db().query('SELECT photo_bytes AS bytes, photo_mime AS mime FROM redaction_rh.employee_profiles WHERE collaborator_id=$1', [id]);
    const row = result.rows[0];
    if (!row?.bytes) return new Response(null, { status: 404 });
    return new Response(row.bytes, {
      headers: {
        'Content-Type': row.mime || 'image/jpeg',
        'Cache-Control': 'private, max-age=120',
      },
    });
  } catch (error) {
    return handleError(error);
  }
}