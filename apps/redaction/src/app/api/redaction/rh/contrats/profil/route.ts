import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { db } from '@/lib/redaction/rh/database';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { isContractId } from '@/lib/redaction/rh/contracts';
import { json, handleError } from '@/lib/redaction/rh/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Only contract managers may read these limited identification fields; never return the full RH profile or photo. */
export async function GET(request: Request) {
  try {
    await requireRhPermission('access_manage');
    if (!(await getRhFlags()).contractsEnabled) return json({ error: 'Contrats RH désactivés.' }, 503);
    const id = new URL(request.url).searchParams.get('collaboratorId');
    if (!isContractId(id)) return json({ error: 'Collaborateur invalide.' }, 400);
    const result = await db().query(`SELECT to_char(p.birth_date,'YYYY-MM-DD') AS "birthDate",p.address,p.phone,p.city
      FROM redaction_rh.collaborators c LEFT JOIN redaction_rh.employee_profiles p ON p.collaborator_id=c.id
      WHERE c.id=$1 AND NOT c.archived`, [id]);
    if (!result.rowCount) return json({ error: 'Collaborateur indisponible.' }, 404);
    return json({ profile: result.rows[0] });
  } catch (error) { return handleError(error); }
}
