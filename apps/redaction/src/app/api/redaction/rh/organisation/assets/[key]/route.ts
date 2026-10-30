import { getRhCapabilities, requireRhPermission } from '@/lib/redaction/rh/authorization';
import { requireRedactionUser, isRedactionSuperAdmin } from '@/lib/redaction/strapi-editor';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { db } from '@/lib/redaction/rh/database';
import { ORGANIZATION_ASSET_KEYS, type OrganizationAssetKey } from '@/lib/redaction/rh/organization';
import { handleError, json, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function authorizeReader() {
  const user = await requireRedactionUser();
  if (isRedactionSuperAdmin(user)) return user;
  const capabilities = await getRhCapabilities();
  if (capabilities.teamRead || capabilities.financeRead || capabilities.accessManage) return user;
  await requireRhPrincipal();
  return user;
}

async function getKey(params: Promise<{ key: string }>): Promise<OrganizationAssetKey | null> {
  const { key } = await params;
  return ORGANIZATION_ASSET_KEYS.includes(key as OrganizationAssetKey) ? key as OrganizationAssetKey : null;
}

function validImage(type: string, bytes: Buffer): boolean {
  return (type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8)
    || (type === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    || (type === 'image/webp' && bytes.toString('ascii', 8, 12) === 'WEBP');
}

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    await authorizeReader();
    const key = await getKey(params);
    if (!key) return json({ error: 'Ressource inconnue.' }, 404);
    const result = await db().query(`SELECT mime_type AS "mimeType",'data:'||mime_type||';base64,'||encode(file_bytes,'base64') AS data FROM redaction_rh.organization_assets WHERE asset_key=$1`, [key]);
    return json({ asset: result.rows[0]?.data ?? null, mimeType: result.rows[0]?.mimeType ?? null });
  } catch (error) { return handleError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const actor = await requireRhPermission('access_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    const key = await getKey(params);
    if (!key) return json({ error: 'Ressource inconnue.' }, 404);
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size < 16 || file.size > 2_000_000) return json({ error: 'Image invalide (2 Mo maximum).' }, 400);
    const type = file.type.toLowerCase();
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!validImage(type, bytes)) return json({ error: 'Formats autorisés : JPG, PNG ou WebP.' }, 415);
    await db().query(
      `INSERT INTO redaction_rh.organization_assets(asset_key,file_bytes,mime_type,updated_by) VALUES($1,$2,$3,$4)
       ON CONFLICT(asset_key) DO UPDATE SET file_bytes=EXCLUDED.file_bytes,mime_type=EXCLUDED.mime_type,updated_by=EXCLUDED.updated_by,updated_at=now()`,
      [key, bytes, type, actor.email],
    );
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    await requireRhPermission('access_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    const key = await getKey(params);
    if (!key) return json({ error: 'Ressource inconnue.' }, 404);
    await db().query('DELETE FROM redaction_rh.organization_assets WHERE asset_key=$1', [key]);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}
