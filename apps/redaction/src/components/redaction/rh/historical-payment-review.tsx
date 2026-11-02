'use client';
import { useRhNotice } from './use-rh-notice';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { formatMinorUnits } from '@/lib/redaction/rh/money';
import { validateHistoricalPayment, type HistoricalPayment } from '@/lib/redaction/rh/historical-payments';
import type { Collaborator } from '@/lib/redaction/rh/collaborator';
import { kinshasaToday } from '@/lib/redaction/rh/activities';

const endpoint = '/api/redaction/rh/paiements-anciens';
export function HistoricalPaymentReview({ readOnly }: { readOnly: boolean }) {
  const [items,setItems]=useState<HistoricalPayment[]>([]); const [people,setPeople]=useState<Collaborator[]>([]);
  const [scope,setScope]=useState<'pending'|'all'>('pending'); const [reload,setReload]=useState(0);
  const [busy,setBusy]=useState(false); const [loading,setLoading]=useState(true);
  const [error,setError]=useRhNotice('error'); const [message,setMessage]=useRhNotice('success');
  const [notes,setNotes]=useState<Record<string,string>>({});
  const [sources,setSources]=useState<Record<string,string>>({});
  const [matches,setMatches]=useState<Record<string,string>>({});
  const [distinct,setDistinct]=useState<Record<string,boolean>>({});
  const [person,setPerson]=useState('');const [date,setDate]=useState('');const [amount,setAmount]=useState('');
  const [currency,setCurrency]=useState<'USD'|'CDF'>('USD');const [kind,setKind]=useState('remuneration');const [method,setMethod]=useState('virement');const [reference,setReference]=useState('');const [provenance,setProvenance]=useState('');
  const key=useRef<string|null>(null);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');
    fetchRedaction(`${endpoint}?status=${scope}`,{cache:'no-store',signal:controller.signal})
      .then(async(r)=>{if(!r.ok)throw new Error();setItems((await r.json()).payments ?? []);})
      .catch(()=>{if(!controller.signal.aborted)setError('Impossible de charger les déclarations.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[scope,reload]);
  useEffect(()=>{if(readOnly)return;const controller=new AbortController();fetchRedaction('/api/redaction/rh/collaborateurs',{cache:'no-store',signal:controller.signal}).then(async(r)=>{if(r.ok)setPeople((await r.json()).collaborators ?? []);}).catch(()=>undefined);return ()=>controller.abort();},[readOnly]);
  async function decide(row:HistoricalPayment, action:'verify'|'reject') {
    setBusy(true);setError('');setMessage('');
    try {
      const response=await fetchRedaction(endpoint,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:row.id,version:row.version,action,note:notes[row.id]??'',source:sources[row.id]??'receipt',matchedWithdrawalId:matches[row.id]||null,confirmDistinct:distinct[row.id]===true})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Décision impossible.');
      setMessage('Décision enregistrée avec traçabilité.');setReload((n)=>n+1);
    } catch(e){setError(e instanceof Error?e.message:'Décision impossible.');}finally{setBusy(false);}
  }
  async function backfill(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();setError('');setMessage('');key.current??=crypto.randomUUID();
    const payload={key:key.current,collaboratorId:person,date,amount,currency,kind,method,reference,note:provenance};
    if(!person||!provenance.trim()||!validateHistoricalPayment(payload,kinshasaToday(),null)){setError('Sélectionnez un dossier et renseignez la provenance, la date et le montant.');return;}
    setBusy(true);
    try{const r=await fetchRedaction(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Saisie impossible.');key.current=null;setDate('');setAmount('');setReference('');setProvenance('');setMessage('Saisie créée. Un second responsable doit la vérifier.');setReload((n)=>n+1);}
    catch(err){setError(err instanceof Error?err.message:'Saisie impossible.');}finally{setBusy(false);}
  }
  return <div className="space-y-5">
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5"><h2 className="font-display text-lg font-bold">Déclarations de paiements anciens</h2><p className="text-sm text-muted-foreground">Comparez chaque déclaration aux justificatifs ou aux relevés existants. Une vérification ne crée pas de retrait et ne modifie jamais les soldes.</p>
      <div className="flex gap-2"><button type="button" aria-pressed={scope==='pending'} onClick={()=>setScope('pending')} className="rounded-lg border border-border px-3 py-2 text-sm">À vérifier</button><button type="button" aria-pressed={scope==='all'} onClick={()=>setScope('all')} className="rounded-lg border border-border px-3 py-2 text-sm">Historique récent</button></div>
      {error&&<p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}{message&&<p role="status" className="text-sm text-primary">{message}</p>}
      {loading&&<p className="text-sm">Chargement…</p>}{!loading&&!error&&items.length===0&&<p className="text-sm text-muted-foreground">Aucune déclaration dans cette vue.</p>}
      {items.map(row=><article key={row.id} className="space-y-2 rounded-xl border border-border p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold">{row.firstName} {row.lastName} · {row.date} · {formatMinorUnits(BigInt(row.amountMinor),row.currency)}</p><span className="rounded-full bg-muted px-2 py-1 text-xs">{row.status}</span></div>
        <p className="text-xs text-muted-foreground">{row.kind} · {row.method} · {row.reference||'Sans référence'} · déclaration : {new Date(row.submittedAt).toLocaleString('fr-FR')}</p>{row.note&&<p>Précisions : {row.note}</p>}{row.reviewNote&&<p>Décision : {row.reviewNote}</p>}
        {row.status==='pending'&&!readOnly&&<div className="space-y-2 border-t border-border pt-3"><label className="block text-xs font-medium">Source vérifiée<select value={sources[row.id]??'receipt'} onChange={(e)=>setSources({...sources,[row.id]:e.target.value})} className="mt-1 block w-full rounded-lg border border-border bg-background p-2"><option value="receipt">Reçu</option><option value="bank">Relevé bancaire / Mobile Money</option><option value="cashbook">Caisse / comptabilité</option><option value="other">Autre source vérifiable</option></select></label>
          {!!row.possibleMatches?.length&&<div className="rounded-xl bg-amber-500/10 p-3 text-xs"><p className="font-semibold">Paiement déjà enregistré de même date, devise et montant : vérifiez les doublons.</p><select aria-label="Rapprocher avec un retrait existant" value={matches[row.id]??''} onChange={(e)=>setMatches({...matches,[row.id]:e.target.value})} className="mt-2 w-full rounded-lg border border-border bg-background p-2"><option value="">Aucun retrait associé</option>{row.possibleMatches.map(m=><option key={m.id} value={m.id}>{m.reference||m.id}</option>)}</select><label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={distinct[row.id]??false} onChange={(e)=>setDistinct({...distinct,[row.id]:e.target.checked})} />Confirmer qu’il s’agit d’un paiement distinct (motif obligatoire)</label></div>}
          <label className="block text-xs font-medium">Motif et trace de contrôle<textarea maxLength={500} required value={notes[row.id]??''} onChange={(e)=>setNotes({...notes,[row.id]:e.target.value})} className="mt-1 w-full rounded-lg border border-border bg-background p-2" /></label><div className="flex gap-2"><button type="button" disabled={busy||!notes[row.id]?.trim()} onClick={()=>void decide(row,'verify')} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">Vérifier</button><button type="button" disabled={busy||!notes[row.id]?.trim()} onClick={()=>void decide(row,'reject')} className="rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-50">Refuser</button></div></div>}
      </article>)}{items.length===200&&<p className="text-xs text-muted-foreground">Seuls les 200 dossiers les plus récents sont affichés dans cette vue ; les rapports parcourent la période complète.</p>}
    </section>
    {!readOnly&&<section className="rounded-2xl border border-border bg-card p-5"><h2 className="font-display text-lg font-bold">Déclarer un ancien paiement pour un collaborateur</h2><p className="mt-1 text-sm text-muted-foreground">L’administrateur financier peut saisir un paiement au nom d’un collaborateur, y compris pour un dossier archivé. Indiquez la provenance : la saisie restera à vérifier par un autre responsable, sans modifier le solde.</p>
      <form onSubmit={backfill} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm">Collaborateur<select required value={person} onChange={(e)=>{setPerson(e.target.value);key.current=null;}} className="mt-1 w-full rounded-lg border border-border bg-background p-2"><option value="">Sélectionner</option>{people.map(p=><option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.archived?' (archivé)':''}</option>)}</select></label>
      <label className="text-sm">Date effective<input required type="date" min="1900-01-01" max={kinshasaToday()} value={date} onChange={(e)=>{setDate(e.target.value);key.current=null;}} className="mt-1 w-full rounded-lg border border-border bg-background p-2" /></label><label className="text-sm">Montant<input required inputMode="decimal" maxLength={18} value={amount} onChange={(e)=>{setAmount(e.target.value);key.current=null;}} className="mt-1 w-full rounded-lg border border-border bg-background p-2" /></label><label className="text-sm">Devise<select value={currency} onChange={(e)=>{setCurrency(e.target.value as 'USD'|'CDF');key.current=null;}} className="mt-1 w-full rounded-lg border border-border bg-background p-2"><option value="USD">USD</option><option value="CDF">CDF</option></select></label><label className="text-sm">Nature<select value={kind} onChange={(e)=>{setKind(e.target.value);key.current=null;}} className="mt-1 w-full rounded-lg border border-border bg-background p-2"><option value="remuneration">Rémunération</option><option value="prestation">Prestation</option><option value="prime">Prime</option><option value="autre">Autre</option></select></label><label className="text-sm">Moyen<select value={method} onChange={(e)=>{setMethod(e.target.value);key.current=null;}} className="mt-1 w-full rounded-lg border border-border bg-background p-2"><option value="virement">Virement</option><option value="mobile_money">Mobile Money</option><option value="especes">Espèces</option><option value="autre">Autre</option></select></label><label className="text-sm">Référence<input maxLength={150} value={reference} onChange={(e)=>{setReference(e.target.value);key.current=null;}} className="mt-1 w-full rounded-lg border border-border bg-background p-2" /></label><label className="text-sm sm:col-span-2">Provenance du renseignement (obligatoire)<textarea required maxLength={500} value={provenance} onChange={(e)=>{setProvenance(e.target.value);key.current=null;}} className="mt-1 w-full rounded-lg border border-border bg-background p-2" /></label><button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">Saisir pour vérification</button></form></section>}
  </div>;
}
