import { createHash, randomBytes } from 'node:crypto';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { db } from '@/lib/redaction/rh/database';
import { isUuid } from '@/lib/redaction/rh/activities';
import { insertRecordSheetPdfSql } from '@/lib/redaction/rh/record-sheet-link-sql';
import { json, handleError, validOrigin } from '@/lib/redaction/rh/api';
import { getRhFlags } from '@/lib/redaction/rh/flags';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const MAX_PDF_BYTES = 12_000_000;

/** L'APK ne sait pas enregistrer les URL blob:. Le PDF est temporairement servi par HTTPS. */
export async function POST(request: Request) {
  try {
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/pdf') return json({ error: 'PDF requis.' }, 415);
    const params = new URL(request.url).searchParams;
    const exportId = params.get('exportId');
    const type = params.get('type');
    const collaboratorId = params.get('collaboratorId');
    if (!exportId || !/^[1-9]\d{0,15}$/.test(exportId) || !['presence','prestations','paiements'].includes(type ?? '') || (collaboratorId && !isUuid(collaboratorId))) return json({ error: 'Référence invalide.' }, 400);
    if (type === 'paiements' && !collaboratorId && !(await getRhFlags()).paymentSheetsVisible) return json({ error: 'Fiche de paiement masquée.' }, 403);
    const actor = collaboratorId ? await requireRhPermission(type === 'paiements' ? 'finance_read' : 'team_read') : await requireRhPrincipal();
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'PDF vide.' }, 400);
    const chunks: Uint8Array[] = []; let length = 0;
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > MAX_PDF_BYTES) { await reader.cancel(); return json({ error: 'PDF trop volumineux (12 Mo maximum).' }, 413); }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks.map(chunk=>Buffer.from(chunk)),length);
    if (bytes.length < 32 || bytes.toString('ascii',0,5) !== '%PDF-' || !bytes.subarray(-1024).toString('ascii').includes('%%EOF')) return json({ error: 'Fichier PDF invalide.' }, 400);
    const token = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(token).digest('hex');
    const client = await db().connect();
    try {
      await client.query('BEGIN');
      // Les anciens documents sont effacés à chaque nouveau dépôt ; aucun lien périmé ne doit être servi.
      await client.query('DELETE FROM redaction_rh.record_sheet_pdf_links WHERE expires_at <= now()');
      const row = await client.query(insertRecordSheetPdfSql,[hash,bytes,exportId,actor.email,type,collaboratorId,actor.id]);
      if (!row.rowCount) { await client.query('ROLLBACK'); return json({ error: 'Export expiré ou dossier non autorisé. Réessayez.' }, 409); }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK').catch(()=>undefined); throw error; }
    finally { client.release(); }
    return json({ token, expiresInSeconds: 600 });
  } catch (error) { return handleError(error); }
}
