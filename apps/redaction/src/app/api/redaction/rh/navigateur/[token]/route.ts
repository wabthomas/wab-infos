import { createHash } from 'node:crypto';
import { db } from '@/lib/redaction/rh/database';
import { json } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params:Promise<{ token:string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) return json({ error:'Lien invalide.' },404);
  try {
    const hash = createHash('sha256').update(token).digest('hex');
    const result = await db().query('SELECT mime_type,file_name,file_bytes FROM redaction_rh.browser_documents WHERE token_hash=$1 AND expires_at>now()',[hash]);
    if (!result.rowCount) return json({ error:'Lien expiré. Régénérez le document depuis votre espace RH.' },404);
    const row = result.rows[0], bytes:Buffer = row.file_bytes;
    const headers = {
      'Content-Type':row.mime_type as string,
      'Content-Disposition':`${row.mime_type === 'text/csv' ? 'attachment' : 'inline'}; filename="${row.file_name}"`,
      'Cache-Control':'private, no-store, max-age=0',
      'Referrer-Policy':'no-referrer', 'X-Robots-Tag':'noindex, nofollow',
      'X-Content-Type-Options':'nosniff', 'Accept-Ranges':'bytes',
    };
    const range = request.headers.get('range');
    if (range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (!match) return new Response(null,{ status:416,headers:{...headers,'Content-Range':`bytes */${bytes.length}`}});
      const start=Number(match[1]), end=match[2]?Number(match[2]):bytes.length-1;
      if (!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=bytes.length) return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${bytes.length}`}});
      const last=Math.min(end,bytes.length-1);
      return new Response(new Uint8Array(bytes.subarray(start,last+1)),{status:206,headers:{...headers,'Content-Range':`bytes ${start}-${last}/${bytes.length}`,'Content-Length':String(last-start+1)}});
    }
    return new Response(new Uint8Array(bytes),{headers:{...headers,'Content-Length':String(bytes.length)}});
  } catch { return json({ error:'Document temporairement indisponible.' },503); }
}
