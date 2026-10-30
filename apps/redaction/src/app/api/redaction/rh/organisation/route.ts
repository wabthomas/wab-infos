import { getRhCapabilities, requireRhPermission } from '@/lib/redaction/rh/authorization';
import { requireRedactionUser, isRedactionSuperAdmin } from '@/lib/redaction/strapi-editor';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { db } from '@/lib/redaction/rh/database';
import { DEFAULT_ORGANIZATION_SETTINGS, ORGANIZATION_SETTING_LABELS, type OrganizationSettingKey } from '@/lib/redaction/rh/organization';
import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';
const keys = Object.keys(ORGANIZATION_SETTING_LABELS) as OrganizationSettingKey[];
const lengths: Record<OrganizationSettingKey, number> = {
  companyName: 160, companyAddress: 500, companyPhone: 100, companyEmail: 320,
  companyWebsite: 240, companyTaxId: 100, companyRegistration: 160,
  directorName: 160, directorTitle: 100, documentHeader: 1200, documentFooter: 1200,
};

async function authorizeReader() {
  const user = await requireRedactionUser();
  if (isRedactionSuperAdmin(user)) return user;
  const capabilities = await getRhCapabilities();
  if (capabilities.teamRead || capabilities.financeRead || capabilities.accessManage) return user;
  await requireRhPrincipal();
  return user;
}

export async function GET() {
  try {
    await authorizeReader();
    const rows = await db().query('SELECT setting_key AS key, setting_value AS value FROM redaction_rh.organization_settings');
    const settings = { ...DEFAULT_ORGANIZATION_SETTINGS };
    for (const row of rows.rows) if (keys.includes(row.key as OrganizationSettingKey)) settings[row.key as OrganizationSettingKey] = row.value;
    return json({ settings, labels: ORGANIZATION_SETTING_LABELS });
  } catch (error) { return handleError(error); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireRhPermission('access_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown;
    try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Paramètres invalides.' }, 400);
    const values = (body as Record<string, unknown>).settings;
    if (!values || typeof values !== 'object' || Array.isArray(values)) return json({ error: 'Paramètres invalides.' }, 400);
    const entries = Object.entries(values as Record<string, unknown>);
    if (!entries.length || entries.some(([key, value]) => !keys.includes(key as OrganizationSettingKey) || typeof value !== 'string' || value.length > lengths[key as OrganizationSettingKey] || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value as string))) return json({ error: 'Un ou plusieurs champs sont invalides.' }, 400);
    const normalized = entries.map(([key, value]) => [key, (value as string).trim()] as const);
    const email = normalized.find(([key]) => key === 'companyEmail')?.[1];
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Adresse e-mail invalide.' }, 400);
    const website = normalized.find(([key]) => key === 'companyWebsite')?.[1];
    if (website) { try { const url = new URL(website); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); } catch { return json({ error: 'Adresse du site web invalide.' }, 400); } }
    const client = await db().connect();
    try {
      await client.query('BEGIN');
      for (const [key, value] of normalized) await client.query(
        `INSERT INTO redaction_rh.organization_settings(setting_key,setting_value,updated_by) VALUES($1,$2,$3)
         ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_by=EXCLUDED.updated_by,updated_at=now()`,
        [key, value, actor.email],
      );
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
