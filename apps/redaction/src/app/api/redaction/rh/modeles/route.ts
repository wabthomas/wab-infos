import { randomUUID } from 'node:crypto';
import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { db } from '@/lib/redaction/rh/database';
import { isUuid } from '@/lib/redaction/rh/activities';
import { validateOfficialTemplate } from '@/lib/redaction/rh/official-documents';
import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const select = `id,kind,title,subject,body,version`;

export async function GET() {
  try {
    await requireRhPermission('access_manage');
    const result = await db().query(`SELECT ${select} FROM redaction_rh.official_templates WHERE NOT archived ORDER BY updated_at DESC,id DESC LIMIT 200`);
    return json({ templates: result.rows });
  } catch (error) { return handleError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRhPermission('access_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown;
    try { body = await readBody(request); } catch { return json({ error: 'Modèle invalide.' }, 400); }
    const template = validateOfficialTemplate(body);
    if (!template) return json({ error: 'Vérifiez le titre, l’objet et le corps du modèle.' }, 400);
    const client = await db().connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(`INSERT INTO redaction_rh.official_templates(id,kind,title,subject,body,created_by)
        VALUES($1,$2,$3,$4,$5,$6) RETURNING ${select}`,
      [randomUUID(),template.kind,template.title,template.subject,template.body,actor.email]);
      await client.query(`INSERT INTO redaction_rh.official_template_events(template_id,actor_email,action) VALUES($1,$2,'create')`, [result.rows[0].id,actor.email]);
      await client.query('COMMIT');
      return json({ template: result.rows[0] }, 201);
    } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
    finally { client.release(); }
  } catch (error) { return handleError(error); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireRhPermission('access_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown;
    try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Requête invalide.' }, 400);
    const row = body as Record<string, unknown>;
    if (!isUuid(row.id) || !Number.isSafeInteger(row.version) || Number(row.version) < 1) return json({ error: 'Référence invalide.' }, 400);
    if (row.action !== 'archive' && row.action !== 'update') return json({ error: 'Action invalide.' }, 400);
    const template = row.action === 'update' ? validateOfficialTemplate(row) : null;
    if (row.action === 'update' && !template) return json({ error: 'Modèle invalide.' }, 400);
    const client = await db().connect();
    try {
      await client.query('BEGIN');
      const result = row.action === 'archive'
        ? await client.query(`UPDATE redaction_rh.official_templates SET archived=true,version=version+1,updated_at=now() WHERE id=$1 AND version=$2 AND NOT archived RETURNING ${select}`,[row.id,row.version])
        : await client.query(`UPDATE redaction_rh.official_templates SET kind=$3,title=$4,subject=$5,body=$6,version=version+1,updated_at=now() WHERE id=$1 AND version=$2 AND NOT archived RETURNING ${select}`,[row.id,row.version,template!.kind,template!.title,template!.subject,template!.body]);
      if (!result.rowCount) { await client.query('ROLLBACK'); return json({ error: 'Modèle modifié ou archivé entre-temps.' }, 409); }
      await client.query(`INSERT INTO redaction_rh.official_template_events(template_id,actor_email,action) VALUES($1,$2,$3)`,[row.id,actor.email,row.action]);
      await client.query('COMMIT');
      return json({ template: result.rows[0] });
    } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
    finally { client.release(); }
  } catch (error) { return handleError(error); }
}
