import { randomUUID } from 'node:crypto';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { db } from '@/lib/redaction/rh/database';
import { isContractId, isContractDate, MAX_CONTRACT_CLAUSES } from '@/lib/redaction/rh/contracts';
import { readContractBody } from '@/lib/redaction/rh/contract-http';
import { json, handleError, validOrigin } from '@/lib/redaction/rh/api';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const select = `id,kind,title,clauses,signature_place AS "signaturePlace",to_char(signature_date,'YYYY-MM-DD') AS "signatureDate",version`;
const template = (raw: unknown) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const v = raw as Record<string,unknown>;
  if ((v.kind!=='CDD'&&v.kind!=='CDI')||typeof v.title!=='string'||!v.title.trim()||v.title.length>120||typeof v.clauses!=='string'||!v.clauses.trim()||v.clauses.length>MAX_CONTRACT_CLAUSES||v.clauses.split('\n').length>250||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v.title+v.clauses)) return null;
  const signaturePlace = v.signaturePlace === undefined ? '' : v.signaturePlace;
  const signatureDate = v.signatureDate === undefined || v.signatureDate === '' ? null : v.signatureDate;
  if (typeof signaturePlace !== 'string' || signaturePlace.length > 120 || /[\u0000-\u001f\u007f]/.test(signaturePlace)
    || (signatureDate !== null && !isContractDate(signatureDate))) return null;
  return { kind:v.kind,title:v.title.trim(),clauses:v.clauses.trim(),signaturePlace:signaturePlace.trim(),signatureDate };
};
export async function GET() {
  try { await requireRhPermission('access_manage'); if (!(await getRhFlags()).contractsEnabled) return json({error:'Contrats RH désactivés.'},503);
    const result=await db().query(`SELECT ${select} FROM redaction_rh.contract_templates WHERE NOT archived ORDER BY updated_at DESC,id DESC LIMIT 200`);
    return json({templates:result.rows});
  }catch(e){return handleError(e);}
}
export async function POST(request:Request) {
  try { const actor=await requireRhPermission('access_manage');if (!(await getRhFlags()).contractsEnabled)return json({error:'Contrats RH désactivés.'},503);
    if(!validOrigin(request))return json({error:'Origine non autorisée.'},403);
    let raw:unknown;try{raw=await readContractBody(request);}catch{return json({error:'Modèle invalide.'},400);}
    const v=template(raw);if(!v)return json({error:'Vérifiez le titre, le type et les clauses.'},400);
    const client=await db().connect();try{await client.query('BEGIN');const result=await client.query(`INSERT INTO redaction_rh.contract_templates(id,kind,title,clauses,signature_place,signature_date,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING ${select}`,[randomUUID(),v.kind,v.title,v.clauses,v.signaturePlace,v.signatureDate,actor.email]);await client.query("INSERT INTO redaction_rh.contract_template_events(template_id,actor_email,action) VALUES($1,$2,'create')",[result.rows[0].id,actor.email]);await client.query('COMMIT');return json({template:result.rows[0]},201);}catch(e){await client.query('ROLLBACK').catch(()=>undefined);throw e;}finally{client.release();}
  }catch(e){return handleError(e);}
}
export async function PATCH(request:Request) {
  try {const actor=await requireRhPermission('access_manage');if (!(await getRhFlags()).contractsEnabled)return json({error:'Contrats RH désactivés.'},503);
    if(!validOrigin(request))return json({error:'Origine non autorisée.'},403);
    let raw:unknown;try{raw=await readContractBody(request);}catch{return json({error:'Modèle invalide.'},400);}
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return json({error:'Modèle invalide.'},400);
    const v=raw as Record<string,unknown>;
    if(!isContractId(v.id)||!Number.isSafeInteger(v.version)||Number(v.version)<1||!['update','archive'].includes(v.action as string))return json({error:'Référence invalide.'},400);
    const value=v.action==='update'?template(v):null;if(v.action==='update'&&!value)return json({error:'Modèle invalide.'},400);
    const client=await db().connect();try{await client.query('BEGIN');
      const result=v.action==='archive' ? await client.query(`UPDATE redaction_rh.contract_templates SET archived=true,version=version+1,updated_at=now() WHERE id=$1 AND version=$2 AND NOT archived RETURNING ${select}`,[v.id,v.version])
        : await client.query(`UPDATE redaction_rh.contract_templates SET kind=$3,title=$4,clauses=$5,signature_place=$6,signature_date=$7,version=version+1,updated_at=now() WHERE id=$1 AND version=$2 AND NOT archived RETURNING ${select}`,[v.id,v.version,value!.kind,value!.title,value!.clauses,value!.signaturePlace,value!.signatureDate]);
      if(!result.rowCount){await client.query('ROLLBACK');return json({error:'Modèle modifié entre-temps.'},409);}
      await client.query('INSERT INTO redaction_rh.contract_template_events(template_id,actor_email,action) VALUES($1,$2,$3)',[v.id,actor.email,v.action]);await client.query('COMMIT');return json({template:result.rows[0]});
    }catch(e){await client.query('ROLLBACK').catch(()=>undefined);throw e;}finally{client.release();}
  }catch(e){return handleError(e);}
}
