import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { db } from '@/lib/redaction/rh/database';
import { parseSheetFilter, sheetQueries, type SheetRow } from '@/lib/redaction/rh/record-sheets';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown;
    try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const filter = parseSheetFilter(body);
    if (!filter) return json({ error: 'Type ou dates invalides (un an maximum).' }, 400);
    if (filter.type === 'paiements') {
      const flags = await getRhFlags();
      if (!flags.financeEnabled || !flags.withdrawalsEnabled) return json({ error: 'Gestion des retraits désactivée : fiche des paiements indisponible.' }, 403);
    }
    let actor: { id: number; email: string };
    if (filter.collaboratorId) actor = await requireRhPermission(filter.type === 'paiements' ? 'finance_read' : 'team_read');
    else actor = await requireRhPrincipal();
    const client = await db().connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      const person = filter.collaboratorId
        ? await client.query(`SELECT id,first_name AS "firstName",last_name AS "lastName",team FROM redaction_rh.collaborators WHERE id=$1`,[filter.collaboratorId])
        : await client.query(`SELECT c.id,c.first_name AS "firstName",c.last_name AS "lastName",c.team FROM redaction_rh.collaborators c
          JOIN redaction_rh.account_links l ON l.collaborator_id=c.id
          WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived`,[actor.id,actor.email]);
      if (person.rowCount !== 1) { await client.query('ROLLBACK'); return json({ error: 'Dossier indisponible.' }, 404); }
      const result = await client.query(sheetQueries[filter.type],[person.rows[0].id,filter.start,filter.end]);
      if (result.rows.length > 5000) { await client.query('ROLLBACK'); return json({ error: 'Plus de 5 000 lignes : réduisez la période.' }, 413); }
      const audit = await client.query(`INSERT INTO redaction_rh.record_sheet_exports(actor_email,collaborator_id,sheet_type,from_date,through_date,row_count)
        VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,[actor.email,person.rows[0].id,filter.type,filter.start,filter.end,result.rows.length]);
      await client.query('COMMIT');
      return json({ person:person.rows[0],filter,rows:result.rows as SheetRow[],exportId:audit.rows[0].id });
    } catch (error) { await client.query('ROLLBACK').catch(()=>undefined); throw error; }
    finally { client.release(); }
  } catch (error) { return handleError(error); }
}
