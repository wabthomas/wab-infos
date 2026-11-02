import { createHash } from 'node:crypto';
import { db } from '@/lib/redaction/rh/database';
import { json } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const privateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Type': 'application/pdf',
  'Content-Disposition': 'inline; filename="fiche-rh.pdf"',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
  'Accept-Ranges': 'bytes',
};

/** URL à usage temporaire et non indexable : le navigateur externe n'a pas les cookies de l'APK. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/.test(token)) return json({ error: 'Lien invalide.' }, 404);
  try {
    const hash = createHash('sha256').update(token).digest('hex');
    const result = await db().query(`SELECT pdf_bytes FROM redaction_rh.record_sheet_pdf_links WHERE token_hash=$1 AND expires_at>now()`,[hash]);
    if (!result.rowCount) return json({ error: 'Lien expiré. Regénérez la fiche depuis votre espace RH.' }, 404);
    const bytes: Buffer = result.rows[0].pdf_bytes;
    const total=bytes.length;
    const range=request.headers.get('range');
    if (range) {
      const match=/^bytes=(\d+)-(\d*)$/.exec(range);
      if (!match) return new Response(null,{status:416,headers:{...privateHeaders,'Content-Range':`bytes */${total}`}});
      const start=Number(match[1]); const end=match[2]?Number(match[2]):total-1;
      if (!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=total) return new Response(null,{status:416,headers:{...privateHeaders,'Content-Range':`bytes */${total}`}});
      const last=Math.min(end,total-1);
      return new Response(new Uint8Array(bytes.subarray(start,last+1)),{status:206,headers:{...privateHeaders,'Content-Range':`bytes ${start}-${last}/${total}`,'Content-Length':String(last-start+1)}});
    }
    return new Response(new Uint8Array(bytes),{headers:{...privateHeaders,'Content-Length':String(total)}});
  } catch { return json({ error: 'Fiche temporairement indisponible.' }, 503); }
}
