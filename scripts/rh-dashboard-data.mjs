import fs from 'node:fs';
// 1) Identité enrichie : fonction, équipe, présence d'une photo.
{
  const file = 'apps/redaction/src/lib/redaction/rh/database.ts';
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(
    "export async function getMyCollaborator(principal: import('./principal').RhPrincipal): Promise<{ id: string; firstName: string; lastName: string } | null> {\n  const result = await db().query(`SELECT c.id,c.first_name AS \"firstName\",c.last_name AS \"lastName\" FROM redaction_rh.collaborators c JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived`, [principal.id, principal.email]);\n  return result.rows[0] ?? null;\n}",
    "export async function getMyCollaborator(principal: import('./principal').RhPrincipal): Promise<{ id: string; firstName: string; lastName: string; jobTitle: string | null; team: string | null; hasPhoto: boolean } | null> {\n  const result = await db().query(`SELECT c.id,c.first_name AS \"firstName\",c.last_name AS \"lastName\",c.job_title AS \"jobTitle\",c.team,EXISTS(SELECT 1 FROM redaction_rh.employee_profiles p WHERE p.collaborator_id=c.id AND p.photo_bytes IS NOT NULL) AS \"hasPhoto\" FROM redaction_rh.collaborators c JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived`, [principal.id, principal.email]);\n  return result.rows[0] ?? null;\n}\n\n/** Compteurs réels de l'accueil personnel : jours de présence et prestations déclarées. */\nexport async function getMyDashboardStats(principal: import('./principal').RhPrincipal): Promise<{ presences: number; prestations: number }> {\n  const result = await db().query(`SELECT\n    (SELECT count(*)::int FROM redaction_rh.attendance a WHERE a.collaborator_id=c.id AND a.check_in IS NOT NULL) AS presences,\n    (SELECT count(*)::int FROM redaction_rh.activity_submissions s WHERE s.collaborator_id=c.id AND s.status<>'cancelled') AS prestations\n    FROM redaction_rh.collaborators c JOIN redaction_rh.account_links l ON l.collaborator_id=c.id\n    WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived`, [principal.id, principal.email]);\n  return { presences: Number(result.rows[0]?.presences ?? 0), prestations: Number(result.rows[0]?.prestations ?? 0) };\n}",
  );
  fs.writeFileSync(file, text, 'utf8');
  console.log('DB', text.includes('getMyDashboardStats') && text.includes('hasPhoto') ? 'OK' : 'MISS');
}

// 2) Photo personnelle accessible en GET (sans droit équipe).
{
  const file = 'apps/redaction/src/app/api/redaction/rh/mon-espace/fiche/photo/route.ts';
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace("import { requireRhPrincipal } from '@/lib/redaction/rh/identity';", "import { requireRhPrincipal } from '@/lib/redaction/rh/identity';");
  if (!text.includes('export async function GET')) {
    text += `\nexport async function GET() {\n  try {\n    const principal = await requireRhPrincipal();\n    const person = await getMyCollaborator(principal);\n    if (!person?.hasPhoto) return new Response(null, { status: 404 });\n    const result = await db().query('SELECT photo_bytes AS bytes, photo_mime AS mime FROM redaction_rh.employee_profiles WHERE collaborator_id=$1', [person.id]);\n    const row = result.rows[0];\n    if (!row?.bytes) return new Response(null, { status: 404 });\n    return new Response(row.bytes, { headers: { 'Content-Type': row.mime || 'image/jpeg', 'Cache-Control': 'private, no-store' } });\n  } catch (error) { return handleError(error); }\n}\n`;
  }
  fs.writeFileSync(file, text, 'utf8');
  console.log('PHOTO', text.includes('export async function GET') ? 'OK' : 'MISS');
}
