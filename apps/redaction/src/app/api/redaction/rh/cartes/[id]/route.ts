import { randomUUID, randomBytes } from 'node:crypto';
import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { db } from '@/lib/redaction/rh/database';
import { json,handleError,readBody,validOrigin } from '@/lib/redaction/rh/api';
import { rhNotificationPush } from '@/lib/redaction/rh/notifications';
import { notifyCollaboratorByEmail } from '@/lib/redaction/web-push';
import { getRhFlags } from '@/lib/redaction/rh/flags';
export const dynamic='force-dynamic';
function validDate(value:unknown):value is string{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(`${value}T00:00:00Z`);return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;}
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    await requireRhPermission('hr_manage');
    if (!(await getRhFlags()).serviceCardsEnabled) return json({error:'Cartes de service désactivées.'},503);
    const {id}=await params;
    if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))return json({error:'Collaborateur invalide.'},400);
    const result=await db().query(`SELECT s.id,s.card_type AS "cardType",s.verification_token AS "verificationToken",s.card_number AS "cardNumber",to_char(s.issued_at,'YYYY-MM-DD') AS "issuedAt",to_char(s.expires_at,'YYYY-MM-DD') AS "expiresAt",c.first_name AS "firstName",c.last_name AS "lastName",c.job_title AS "jobTitle",c.team,p.work_location AS "workLocation",CASE WHEN p.photo_bytes IS NULL THEN NULL ELSE 'data:'||p.photo_mime||';base64,'||encode(p.photo_bytes,'base64') END AS photo
      FROM redaction_rh.service_cards s JOIN redaction_rh.collaborators c ON c.id=s.collaborator_id LEFT JOIN redaction_rh.employee_profiles p ON p.collaborator_id=c.id
      WHERE s.collaborator_id=$1 AND NOT c.archived AND s.status='active' AND s.expires_at>=CURRENT_DATE ORDER BY s.issued_at DESC,s.id DESC LIMIT 1`,[id]);
    const card=result.rows[0]??null;
    if(card?.cardType==='press') {
      const app=process.env.REDACTION_APP_URL||process.env.NEXT_PUBLIC_REDACTION_URL;
      if(!app)return json({error:'Adresse publique des cartes de presse indisponible.'},503);
      const base=new URL(app);
      if(process.env.NODE_ENV==='production'&&base.protocol!=='https:')return json({error:'Adresse publique HTTPS requise.'},503);
      card.verificationUrl=new URL(`${base.pathname.replace(/\/$/,'')}/verification/carte/${card.verificationToken}`,base.origin).toString();
    }
    return json({card});
  } catch(error) {return handleError(error);}
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const admin=await requireRhPermission('hr_manage');const flags=await getRhFlags();if(!flags.serviceCardsEnabled)return json({error:'Cartes de service désactivées.'},503);if(!validOrigin(request))return json({error:'Origine non autorisée.'},403);const {id:personId}=await params;if(!/^[0-9a-f-]{36}$/i.test(personId))return json({error:'Collaborateur invalide.'},400);let body:unknown;try{body=await readBody(request);}catch{return json({error:'Requête invalide.'},400);}if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Requête invalide.'},400);const data=body as Record<string,unknown>;if(data.cardType==='press' && data.pressApproved!==true)return json({error:'Confirmez l’autorisation du DG et la validation du texte de la carte de presse avant émission.'},400);if(!validDate(data.issuedAt)||!validDate(data.expiresAt)||data.expiresAt<data.issuedAt||!['service','press'].includes(data.cardType as string))return json({error:'Dates d’émission et d’expiration invalides.'},400);const client=await db().connect();let cardId='',email='';try{await client.query('BEGIN');const person=await client.query(`SELECT c.id,c.job_title,p.employee_number,l.account_email FROM redaction_rh.collaborators c JOIN redaction_rh.employee_profiles p ON p.collaborator_id=c.id LEFT JOIN redaction_rh.account_links l ON l.collaborator_id=c.id WHERE c.id=$1 AND NOT c.archived FOR UPDATE OF c`,[personId]);if(!person.rowCount){await client.query('ROLLBACK');return json({error:'Dossier RH ou matricule introuvable.'},404);}if(!person.rows[0].employee_number){await client.query('ROLLBACK');return json({error:'Attribuez d’abord un matricule.'},409);}if(data.cardType==='press' && !/journalist|reporter|correspondant|rédacteur/i.test(person.rows[0].job_title)) {await client.query('ROLLBACK');return json({error:'La carte de presse est réservée aux fonctions journalistiques du dossier.'},409);}
if(data.cardType==='press') {
  const check=await client.query(`SELECT
    (SELECT count(*)::int FROM redaction_rh.organization_assets WHERE asset_key IN ('company-seal','director-signature','company-logo')) AS assets,
    (SELECT setting_value FROM redaction_rh.organization_settings WHERE setting_key='directorName') AS director,
    (SELECT setting_value FROM redaction_rh.organization_settings WHERE setting_key='companyName') AS company,
    (SELECT count(*)::int FROM redaction_rh.organization_settings WHERE setting_key IN ('companyRegistration','companyTaxId') AND length(trim(setting_value))>0) AS identifiers,
    (SELECT photo_bytes IS NOT NULL FROM redaction_rh.employee_profiles WHERE collaborator_id=$1) AS photo`,[personId]);
  if(!check.rows[0]?.photo || !check.rows[0]?.director?.trim() || !check.rows[0]?.company?.trim() || check.rows[0]?.identifiers<1 || check.rows[0]?.assets!==3){await client.query('ROLLBACK');return json({error:'Carte de presse : photo, identité de l’entreprise (nom et RCCM ou identifiant fiscal), logo, sceau, nom et signature image du DG sont obligatoires.'},409);}
}
if(data.cardType==='press') {const app=process.env.REDACTION_APP_URL||process.env.NEXT_PUBLIC_REDACTION_URL;try{const url=new URL(app||'');if(!['http:','https:'].includes(url.protocol)||(process.env.NODE_ENV==='production'&&url.protocol!=='https:'))throw new Error();}catch{await client.query('ROLLBACK');return json({error:'Configurez l’URL publique HTTPS de la Rédaction avant une carte de presse.'},503);}}
cardId=randomUUID();const token=data.cardType==='press'?randomBytes(32).toString('hex'):null;email=person.rows[0].account_email??'';const cardNumber=`${person.rows[0].employee_number}`;await client.query(`UPDATE redaction_rh.service_cards SET status='revoked' WHERE collaborator_id=$1 AND status='active'`,[personId]);await client.query(`INSERT INTO redaction_rh.service_cards(id,collaborator_id,card_number,issued_at,expires_at,created_by,card_type,verification_token) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[cardId,personId,cardNumber,data.issuedAt,data.expiresAt,admin.email,data.cardType,token]);if(email&&flags.notificationsEnabled)await client.query(`INSERT INTO redaction_rh.notifications(id,collaborator_id,account_id,account_email,event_type,source_id,source_version) SELECT $1,l.collaborator_id,l.account_id,l.account_email,'service_card',$2,1 FROM redaction_rh.account_links l WHERE l.collaborator_id=$3`,[randomUUID(),cardId,personId]);await client.query('INSERT INTO redaction_rh.audit_log(actor_email,action,collaborator_id) VALUES($1,$2,$3)',[admin.email,'service_card_issue',personId]);await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}if(email&&flags.notificationsEnabled)try{await notifyCollaboratorByEmail(email,rhNotificationPush('service_card'));}catch(error){console.warn('[rh] service-card push failed',error);}return json({ok:true,cardId});}catch(error){return handleError(error);}}
