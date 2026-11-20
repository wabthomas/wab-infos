import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/database.ts';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const start = lines.findIndex(line => line.includes('export async function getMyCollaborator'));
if (start < 0) { console.log('MISS'); process.exit(1); }
lines.splice(start, 4,
  "export async function getMyCollaborator(principal: import('./principal').RhPrincipal): Promise<{ id: string; firstName: string; lastName: string; jobTitle: string | null; team: string | null; hasPhoto: boolean } | null> {",
  '  const result = await db().query(`SELECT c.id,c.first_name AS "firstName",c.last_name AS "lastName",c.job_title AS "jobTitle",c.team,EXISTS(SELECT 1 FROM redaction_rh.employee_profiles p WHERE p.collaborator_id=c.id AND p.photo_bytes IS NOT NULL) AS "hasPhoto" FROM redaction_rh.collaborators c JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived`, [principal.id, principal.email]);',
  '  return result.rows[0] ?? null;',
  '}',
  '',
  '/** Compteurs réels de l’accueil personnel : jours de présence et prestations déclarées. */',
  "export async function getMyDashboardStats(principal: import('./principal').RhPrincipal): Promise<{ presences: number; prestations: number }> {",
  '  const result = await db().query(`SELECT',
  "    (SELECT count(*)::int FROM redaction_rh.attendance a WHERE a.collaborator_id=c.id AND a.check_in IS NOT NULL) AS presences,",
  "    (SELECT count(*)::int FROM redaction_rh.activity_submissions s WHERE s.collaborator_id=c.id AND s.status<>'cancelled') AS prestations",
  '    FROM redaction_rh.collaborators c JOIN redaction_rh.account_links l ON l.collaborator_id=c.id',
  '    WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived`, [principal.id, principal.email]);',
  '  return { presences: Number(result.rows[0]?.presences ?? 0), prestations: Number(result.rows[0]?.prestations ?? 0) };',
  '}',
);
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('DB OK');
