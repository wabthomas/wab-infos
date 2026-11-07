import { getRhFlags } from '@/lib/redaction/rh/flags';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { db } from '@/lib/redaction/rh/database';
import { isContractId } from '@/lib/redaction/rh/contracts';
import { renderContractPdf } from '@/lib/redaction/rh/contract-pdf';
import { readContractBody } from '@/lib/redaction/rh/contract-http';
import { json, handleError, validOrigin } from '@/lib/redaction/rh/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const principal = await requireRhPrincipal();
    if (!(await getRhFlags()).contractsEnabled) return json({ error: 'Contrats RH désactivés.' }, 503);
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    const { id } = await params;
    if (!isContractId(id)) return json({ error: 'Contrat invalide.' }, 400);
    let raw: unknown; try { raw = await readContractBody(request, 300_000); } catch { return json({ error: 'Réponse invalide.' }, 400); }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return json({ error: 'Réponse invalide.' }, 400);
    const { action, consent, signature, signatureImage, version } = raw as Record<string,unknown>;
    const declining = action === 'decline';
    if (!Number.isSafeInteger(version) || (declining ? consent !== false : consent !== true || typeof signature !== 'string' || !signature.trim() || signature.length>120 || typeof signatureImage !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(signatureImage) || signatureImage.length>270_000)) return json({ error: 'Réponse, accord ou signature personnelle invalide.' }, 400);
    const client = await db().connect();
    try {
      await client.query('BEGIN');
      const found = await client.query(`SELECT k.*,to_char(k.start_date,'YYYY-MM-DD') AS start_text,to_char(k.end_date,'YYYY-MM-DD') AS end_text,c.first_name,c.last_name,c.archived
        FROM redaction_rh.contract_cases k JOIN redaction_rh.collaborators c ON c.id=k.collaborator_id
        JOIN redaction_rh.account_links l ON l.collaborator_id=c.id
        WHERE k.id=$1 AND l.account_id=$2 AND l.account_email=$3 AND k.proposed_account_id=l.account_id AND k.proposed_account_email=l.account_email
        FOR UPDATE OF k,c, l`,[id,principal.id,principal.email]);
      const row = found.rows[0];
      if (!row || row.archived || row.status!=='proposed' || row.version!==version) { await client.query('ROLLBACK'); return json({ error: 'Contrat indisponible, modifié ou déjà accepté.' }, 409); }
      if (declining) {
        await client.query("UPDATE redaction_rh.contract_cases SET status='declined',declined_at=now(),version=version+1,updated_at=now() WHERE id=$1",[id]);
        await client.query("INSERT INTO redaction_rh.contract_case_events(contract_id,actor_email,action) VALUES($1,$2,'decline')",[id,principal.email]);
        await client.query('COMMIT'); return json({ ok:true });
      }
      const personName = `${row.first_name} ${row.last_name}`;
      const normalize = (value: string) => value.trim().replace(/\s+/g,' ').toLocaleLowerCase('fr');
      if (normalize(signature as string) !== normalize(personName)) { await client.query('ROLLBACK'); return json({ error: 'Saisissez votre nom complet tel qu’il apparaît sur le contrat.' }, 400); }
      let visualSignature: Buffer;
      try {
        visualSignature = Buffer.from((signatureImage as string).split(',')[1],'base64');
        if (visualSignature.length < 150 || visualSignature.length > 200_000) throw new Error('Image invalide');
        const image = sharp(visualSignature,{limitInputPixels:500_000});
        const meta = await image.metadata();
        if (meta.format!=='png' || !meta.hasAlpha || !meta.width || !meta.height || meta.width<100 || meta.height<40 || meta.width>1200 || meta.height>400) throw new Error('Image invalide');
        if ((await image.stats()).channels[3]?.max < 50) throw new Error('Signature vide');
        visualSignature = await image.resize(600,200,{fit:'inside',withoutEnlargement:true}).png().toBuffer();
      } catch { await client.query('ROLLBACK'); return json({ error: 'Dessinez votre signature dans la zone prévue.' }, 400); }
      const accepted = new Date();
      const pdf = await renderContractPdf({ kind:row.kind, firstName:row.party_snapshot?.firstName || row.first_name,lastName:row.party_snapshot?.lastName || row.last_name,jobTitle:row.job_title,workLocation:row.work_location,startDate:row.start_text,endDate:row.end_text,salary:row.salary.toString(),currency:row.currency,clauses:row.clauses,signaturePlace:row.signature_place,signatureDate:row.signature_date instanceof Date ? row.signature_date.toISOString().slice(0,10) : row.signature_date,parties:row.party_snapshot,employer:row.employer_snapshot,sealBytes:row.seal_bytes,signatureBytes:row.signature_bytes,employeeSignature:(signature as string).trim(),employeeSignatureBytes:visualSignature,acceptedAt:accepted.toISOString() });
      if (pdf.length > 5_000_000) { await client.query('ROLLBACK'); return json({ error: 'PDF trop volumineux ; contactez l’administration.' }, 413); }
      await client.query(`UPDATE redaction_rh.contract_cases SET status='accepted',employee_signature=$2,employee_signature_bytes=$8,employee_account_id=$3,employee_account_email=$4,accepted_at=$5,pdf_bytes=$6,pdf_sha256=$7,version=version+1,updated_at=now() WHERE id=$1`,[id,(signature as string).trim(),principal.id,principal.email,accepted,pdf,createHash('sha256').update(pdf).digest(),visualSignature]);
      await client.query("INSERT INTO redaction_rh.contract_case_events(contract_id,actor_email,action) VALUES($1,$2,'accept')",[id,principal.email]);
      await client.query('COMMIT');
      return json({ ok:true });
    } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
    finally { client.release(); }
  } catch (error) { return handleError(error); }
}
