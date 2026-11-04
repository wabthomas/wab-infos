import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator, db } from '@/lib/redaction/rh/database';
import { handleError, json } from '@/lib/redaction/rh/api';
import { getRhFlags } from '@/lib/redaction/rh/flags';
export const dynamic='force-dynamic';
export async function GET(){try{if(!(await getRhFlags()).serviceCardsEnabled)return json({error:'Cartes de service désactivées.'},503);const principal=await requireRhPrincipal();const person=await getMyCollaborator(principal);if(!person)return json({error:'Dossier RH indisponible.'},403);const result=await db().query(`SELECT s.id,s.card_type AS "cardType",s.verification_token AS "verificationToken",s.card_number AS "cardNumber",to_char(s.issued_at,'YYYY-MM-DD') AS "issuedAt",to_char(s.expires_at,'YYYY-MM-DD') AS "expiresAt",c.first_name AS "firstName",c.last_name AS "lastName",c.job_title AS "jobTitle",c.team,p.work_location AS "workLocation",p.photo_mime AS "photoMime",CASE WHEN p.photo_bytes IS NULL THEN NULL ELSE 'data:'||p.photo_mime||';base64,'||encode(p.photo_bytes,'base64') END AS photo FROM redaction_rh.service_cards s JOIN redaction_rh.collaborators c ON c.id=s.collaborator_id LEFT JOIN redaction_rh.employee_profiles p ON p.collaborator_id=c.id WHERE s.collaborator_id=$1 AND s.status='active' AND s.expires_at>=CURRENT_DATE ORDER BY s.issued_at DESC LIMIT 1`,[person.id]);const card=result.rows[0]??null;
    if(card?.cardType==='press') {
      const app=process.env.REDACTION_APP_URL||process.env.NEXT_PUBLIC_REDACTION_URL;
      if(!app)return json({error:'Adresse publique des cartes de presse indisponible.'},503);
      const base=new URL(app);
      if(process.env.NODE_ENV==='production'&&base.protocol!=='https:')return json({error:'Adresse publique HTTPS requise.'},503);
      card.verificationUrl=new URL(`${base.pathname.replace(/\/$/,'')}/verification/carte/${card.verificationToken}`,base.origin).toString();
    }
    return json({card});}catch(error){return handleError(error);}}
