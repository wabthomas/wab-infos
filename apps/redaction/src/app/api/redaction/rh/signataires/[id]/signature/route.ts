import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { detectSignatureImage, updateSignatorySignature } from '@/lib/redaction/rh/signatories';
import { json, handleError, validOrigin } from '@/lib/redaction/rh/api';
import { db } from '@/lib/redaction/rh/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRhPermission('access_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    const { id } = await params;
    let form: FormData;
    try { form = await request.formData(); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const version = Number(form.get('version'));
    if (!Number.isSafeInteger(version) || version < 1) return json({ error: 'Version invalide.' }, 400);
    const file = form.get('signature');
    let signature: { bytes: Buffer; mime: string } | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > 1_500_000) return json({ error: 'Signature trop lourde (1,5 Mo maximum).' }, 400);
      const bytes = Buffer.from(await file.arrayBuffer());
      const mime = detectSignatureImage(bytes);
      if (!mime) return json({ error: 'Signature : PNG, JPG ou WebP attendu.' }, 415);
      signature = { bytes, mime };
    }
    const ok = await updateSignatorySignature(id, version, signature);
    if (!ok) return json({ error: 'Signataire modifié entre-temps. Actualisez.' }, 409);
    return json({ ok: true });
  } catch (error) { return handleError(error); }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRhPermission('access_manage');
    const { id } = await params;
    const result = await db().query('SELECT signature_bytes AS bytes, signature_mime AS mime FROM redaction_rh.document_signatories WHERE id=$1', [id]);
    const row = result.rows[0];
    if (!row?.bytes) return json({ error: 'Signature absente.' }, 404);
    return new Response(new Uint8Array(row.bytes as Buffer), { headers: { 'Content-Type': row.mime || 'image/png', 'Cache-Control': 'private, no-store' } });
  } catch (error) { return handleError(error); }
}
