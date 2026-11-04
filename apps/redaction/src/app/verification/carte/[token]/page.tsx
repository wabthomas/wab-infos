import type { Metadata } from 'next';
import { db } from '@/lib/redaction/rh/database';

export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata:Metadata={title:'Vérification de carte de presse',robots:{index:false,follow:false}};

export default async function VerifyPressCard({params}:{params:Promise<{token:string}>}) {
  const {token}=await params;
  let card: { card_number:string;status:string;issued_at:string;expires_at:string;archived:boolean;valid_now:boolean }|null=null;
  let company:Record<string,string>={};
  if(/^[a-f0-9]{64}$/.test(token)) {
    try {
      const found=await db().query(`SELECT s.card_number,to_char(s.issued_at,'YYYY-MM-DD') AS issued_at,to_char(s.expires_at,'YYYY-MM-DD') AS expires_at,s.status,c.archived,
        (s.status='active' AND NOT c.archived AND s.issued_at<=timezone('Africa/Kinshasa',now())::date AND s.expires_at>=timezone('Africa/Kinshasa',now())::date) AS valid_now
        FROM redaction_rh.service_cards s JOIN redaction_rh.collaborators c ON c.id=s.collaborator_id
        WHERE s.verification_token=$1 AND s.card_type='press' LIMIT 1`,[token]);
      card=found.rows[0]??null;
      if(card) {
        const rows=await db().query("SELECT setting_key,setting_value FROM redaction_rh.organization_settings WHERE setting_key IN ('companyName','companyWebsite','companyRegistration','companyTaxId','companyPhone','companyEmail')");
        company=Object.fromEntries(rows.rows.map(row=>[row.setting_key,row.setting_value]));
      }
    } catch {card=null;}
  }
  return <main className="mx-auto min-h-screen max-w-xl p-6 sm:py-16"><section className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-9">
    <p className="text-xs font-bold uppercase tracking-widest text-primary">Wab-infos · vérification RH</p>
    <h1 className="mt-3 text-2xl font-bold">Carte de presse · statut actuel</h1>
    {card ? <div className="mt-6 space-y-4 text-sm">
      <p className={`rounded-xl p-4 text-base font-bold ${card.valid_now?'bg-emerald-100 text-emerald-900':'bg-red-100 text-red-900'}`}>{card.valid_now?'Carte active à la date de cette consultation':card.status==='revoked'||card.archived?'Carte révoquée ou dossier inactif':'Carte expirée ou non encore valable'}</p>
      <dl className="grid gap-3 rounded-xl bg-muted/50 p-4"><div><dt className="text-muted-foreground">Entreprise</dt><dd className="font-semibold">{company.companyName||'Wab-infos'}</dd></div>
        {company.companyRegistration&&<div><dt className="text-muted-foreground">RCCM</dt><dd>{company.companyRegistration}</dd></div>}
        {company.companyTaxId&&<div><dt className="text-muted-foreground">Identifiant fiscal</dt><dd>{company.companyTaxId}</dd></div>}
        {company.companyPhone&&<div><dt className="text-muted-foreground">Téléphone de l’entreprise</dt><dd>{company.companyPhone}</dd></div>}
        {company.companyEmail&&<div><dt className="text-muted-foreground">E-mail de l’entreprise</dt><dd>{company.companyEmail}</dd></div>}
        {company.companyWebsite&&<div><dt className="text-muted-foreground">Site officiel</dt><dd>{company.companyWebsite}</dd></div>}
        <div><dt className="text-muted-foreground">Numéro à comparer sur la carte</dt><dd className="font-mono font-semibold">{card.card_number}</dd></div>
        <div><dt className="text-muted-foreground">Période inscrite</dt><dd>{card.issued_at} — {card.expires_at}</dd></div>
      </dl>
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">Comparez la carte présentée avec le titulaire et confirmez auprès des RH en cas de doute. Un QR recopié sur une autre carte ne prouve ni son authenticité matérielle ni l’identité du porteur. Cette carte d’entreprise ne constitue pas une accréditation délivrée par une autorité publique.</p>
    </div> : <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-900">Carte non vérifiable. Ce lien est inconnu ou le registre est indisponible ; contactez l’entreprise.</p>}
  </section></main>;
}
