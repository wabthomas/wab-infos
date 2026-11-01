import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { isUuid, isValidDate } from '@/lib/redaction/rh/activities';
import { listTeamAttendance } from '@/lib/redaction/rh/extras-db';
import { handleError, json } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireRhPermission('hr_manage');
    const params = new URL(request.url).searchParams;
    const from = params.get('from');
    const to = params.get('to');
    const collaboratorId = params.get('collaboratorId');
    const days = from && to ? (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1 : NaN;
    if (!isValidDate(from) || !isValidDate(to) || from > to || days > 366 || (collaboratorId && !isUuid(collaboratorId))) {
      return json({ error: 'Période invalide (366 jours maximum) ou collaborateur invalide.' }, 400);
    }
    const attendance = await listTeamAttendance(from, to, collaboratorId);
    return json({ attendance, truncated: attendance.length === 2000 });
  } catch (error) {
    return handleError(error);
  }
}
