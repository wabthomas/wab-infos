import { randomBytes, createHash } from 'node:crypto';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { db } from '@/lib/redaction/rh/database';
import { json, handleError, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const LIMIT = 12_000_000;

/** Private export, posted by the authenticated owner. The browser gets only a short-lived opaque URL. */
export async function POST(request: Request) {
  try {
    const principal = await requireRhPrincipal();
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    const mime = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (mime !== 'application/pdf' && mime !== 'image/png' && mime !== 'image/jpeg' && mime !== 'text/csv') return json({ error: 'PDF, PNG, JPEG ou CSV requis.' }, 415);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Document vide.' }, 400);
    const chunks: Buffer[] = []; let size = 0;
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > LIMIT) { await reader.cancel(); return json({ error: 'Document trop volumineux (12 Mo maximum).' }, 413); }
      chunks.push(Buffer.from(value));
    }
    const bytes = Buffer.concat(chunks, size);
    if (mime === 'text/csv') {
      try { if (bytes.length < 16 || bytes.includes(0) || new TextDecoder('utf-8',{fatal:true}).decode(bytes).length < 16) return json({error:'CSV invalide.'},400); }
      catch { return json({error:'CSV invalide.'},400); }
    }
    if (mime !== 'text/csv' && (mime === 'application/pdf' ? !(bytes.subarray(0,5).toString('ascii') === '%PDF-' && bytes.subarray(-1024).toString('ascii').includes('%%EOF'))
      : mime === 'image/png' ? !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : !(bytes[0] === 255 && bytes[1] === 216 && bytes[bytes.length-2] === 255 && bytes[bytes.length-1] === 217))) return json({ error: 'Fichier invalide.' }, 400);
    const token = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(token).digest('hex');
    const suffix = mime === 'application/pdf' ? '.pdf' : mime === 'image/png' ? '.png' : mime === 'image/jpeg' ? '.jpg' : '.csv';
    const rawName = request.headers.get('x-document-name') || 'document-rh';
    const name = `${rawName.replace(/\.(pdf|png|jpg|jpeg|csv)$/i,'').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,100) || 'document-rh'}${suffix}`;
    const client = await db().connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM redaction_rh.browser_documents WHERE expires_at<=now()');
      // A bounded number of active links per owner; no persistent document library.
      await client.query(`DELETE FROM redaction_rh.browser_documents WHERE token_hash IN
        (SELECT token_hash FROM redaction_rh.browser_documents WHERE owner_email=$1 ORDER BY expires_at DESC OFFSET 7)`,[principal.email]);
      await client.query(`INSERT INTO redaction_rh.browser_documents(token_hash,owner_email,mime_type,file_name,file_bytes,expires_at)
        VALUES($1,$2,$3,$4,$5,now()+interval '10 minutes')`,[hash,principal.email,mime,name,bytes]);
      await client.query('COMMIT');
    } catch(error) { await client.query('ROLLBACK').catch(()=>undefined); throw error; }
    finally { client.release(); }
    return json({ token, expiresInSeconds:600 });
  } catch(error) { return handleError(error); }
}
