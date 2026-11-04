import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { db } from '@/lib/redaction/rh/database';
import { json, handleError, validOrigin } from '@/lib/redaction/rh/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const actor = await requireRhPermission('access_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    const { token } = await params;
    if (!/^[a-f0-9]{64}$/.test(token) || request.headers.get('content-type') !== 'image/png') return json({ error: 'Émission invalide.' }, 400);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Image manquante.' }, 400);
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 6_000_000) { await reader.cancel(); return json({ error: 'PNG trop volumineux (6 Mo maximum).' }, 413); }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
    if (bytes.length < 100 || !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return json({ error: 'PNG invalide.' }, 400);
    const metadata = await sharp(bytes, { limitInputPixels: 9_000_000 }).metadata().catch(() => null);
    if (metadata?.format !== 'png' || metadata.width !== 2480 || metadata.height !== 3508) return json({ error: 'Le document doit être un PNG A4 HD (2480 × 3508).' }, 400);
    const tokenHash = createHash('sha256').update(token).digest();
    const hash = createHash('sha256').update(bytes).digest();
    const result = await db().query(`UPDATE redaction_rh.official_issues SET png_bytes=$1,png_hash=$2,status='issued',issued_at=now()
      WHERE token_hash=$3 AND created_by=$4 AND status='pending' AND created_at>now()-interval '15 minutes'
      RETURNING encode(content_hash,'hex') AS fingerprint`,[bytes,hash,tokenHash,actor.email]);
    if (!result.rowCount) return json({ error: 'Émission expirée ou déjà confirmée : relancez une émission.' }, 409);
    return json({ fingerprint: result.rows[0].fingerprint, pngHash: hash.toString('hex') });
  } catch (error) { return handleError(error); }
}
