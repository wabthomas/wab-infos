import { getRhCapabilities, requireRhPermission } from '@/lib/redaction/rh/authorization';
import { requireRedactionUser, isRedactionSuperAdmin } from '@/lib/redaction/strapi-editor';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { db } from '@/lib/redaction/rh/database';
import { ORGANIZATION_ASSET_KEYS, type OrganizationAssetKey } from '@/lib/redaction/rh/organization';
import sharp from 'sharp';
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

function detectImage(bytes: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

async function decodeAsset(bytes: Buffer, mimeType: string): Promise<{ data: string; mimeType: string }> {
  let output = bytes;
  let type = mimeType;
  try {
    const image = sharp(bytes, { limitInputPixels: 80_000_000 });
    const meta = await image.metadata();
    if (bytes.length > 300_000 || (meta.width ?? 0) > 1400) {
      const png = meta.format !== 'jpeg';
      output = await image.resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
        .toFormat(png ? 'png' : 'jpeg', { quality: 86 }).toBuffer();
      type = png ? 'image/png' : 'image/jpeg';
    }
  } catch { /* format inattendu : servir l'original */ }
  return { data: `data:${type};base64,${output.toString('base64')}`, mimeType: type };
}

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    await authorizeReader();
    const key = await getKey(params);
    if (!key) return json({ error: 'Ressource inconnue.' }, 404);
    const result = await db().query('SELECT mime_type AS "mimeType",file_bytes AS bytes FROM redaction_rh.organization_assets WHERE asset_key=$1', [key]);
    const row = result.rows[0];
    if (!row) return json({ asset: null, mimeType: null });
    const { data, mimeType } = await decodeAsset(row.bytes as Buffer, row.mimeType as string);
    return json({ asset: data, mimeType });
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
    const bytes = Buffer.from(await file.arrayBuffer());
    const type = detectImage(bytes);
    if (!type) return json({ error: 'Formats autorisés : JPG, PNG ou WebP.' }, 415);
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
