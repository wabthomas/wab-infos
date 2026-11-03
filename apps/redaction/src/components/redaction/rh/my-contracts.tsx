'use client';
import { useEffect, useState } from 'react';
import { FileSignature, Download, CheckCircle2 } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { VisualSignature } from './visual-signature';
import { useToast } from '@/components/ui/toast';

type Contract = { id:string; kind:'CDD'|'CDI'; companyName:string; firstName:string;lastName:string;jobTitle:string;workLocation:string;startDate:string;endDate:string|null;salary:string;currency:string;clauses:string;status:'proposed'|'accepted'|'declined';version:number;proposedAt:string;acceptedAt:string|null };
export function MyContracts() {
  const toast = useToast();
  const [items,setItems] = useState<Contract[]>([]);
  const [error,setError] = useState(''), [busy,setBusy] = useState(''), [loading,setLoading] = useState(true);
  const [signature,setSignature] = useState<Record<string,string>>({}), [signatureImages,setSignatureImages] = useState<Record<string,string|null>>({}), [consents,setConsents] = useState<Record<string,boolean>>({});
  async function refresh() {
    const r=await fetchRedaction('/api/redaction/rh/mon-espace/contrats',{cache:'no-store'});
    const data=await r.json(); if(!r.ok)throw new Error(data.error||'Contrats indisponibles.');
    setItems(data.contracts);
  }
  useEffect(()=>{ let active=true; fetchRedaction('/api/redaction/rh/mon-espace/contrats',{cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error||'Contrats indisponibles.');if(active)setItems(data.contracts);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Lecture impossible.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  async function download(id:string) {
    setBusy(id); setError('');
    try {
      const r=await fetchRedaction(`/api/redaction/rh/mon-espace/contrats/${id}/pdf`,{cache:'no-store'});
      if(!r.ok) {const data=await r.json();throw new Error(data.error||'PDF indisponible.');}
      const url=URL.createObjectURL(await r.blob());
      const a=document.createElement('a');a.href=url;a.download=`contrat-rh-${id}.pdf`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(e){const message=e instanceof Error?e.message:'Téléchargement impossible.';setError(message);toast.error(message);}finally{setBusy('');}
  }
  async function decline(item:Contract) {
    if (!window.confirm('Refuser ce projet ? Vous ne pourrez plus l’accepter ; contactez la gestion RH pour une nouvelle version.')) return;
    setBusy(item.id);setError('');
    try {
      const r=await fetchRedaction(`/api/redaction/rh/mon-espace/contrats/${item.id}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'decline',consent:false,version:item.version})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'Refus impossible.');
      await refresh();toast.info('Refus enregistré. Contactez la gestion RH pour une nouvelle version.');
    }catch(e){const message=e instanceof Error?e.message:'Refus impossible.';setError(message);toast.error(message);}finally{setBusy('');}
  }
  async function accept(item:Contract) {
    if(!consents[item.id] || !signature[item.id]?.trim() || !signatureImages[item.id])return;
    setBusy(item.id);setError('');
    try {
      const r=await fetchRedaction(`/api/redaction/rh/mon-espace/contrats/${item.id}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({consent:true,signature:signature[item.id],signatureImage:signatureImages[item.id],version:item.version})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'Accord impossible.');
      await refresh();toast.success('Votre accord visuel a été enregistré. Conservez le PDF reçu.');
    }catch(e){const message=e instanceof Error?e.message:'Accord impossible.';setError(message);toast.error(message);}finally{setBusy('');}
  }
  return <div className="space-y-5">
    <header className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-3"><FileSignature className="h-6 w-6 text-primary"/><div><h2 className="text-lg font-bold">Mes contrats</h2><p className="text-sm text-muted-foreground">Projets CDD/CDI à lire et exemplaires acceptés.</p></div></div></header>
    {error&&<p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
    {loading&&<p role="status" className="text-sm">Chargement des contrats…</p>}
    {!loading&&!items.length&&<p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">Aucun projet de contrat ne vous a été transmis.</p>}
    {items.map(item=><article key={item.id} className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-widest text-primary">{item.kind} · {item.companyName}</p><h3 className="mt-1 text-lg font-bold">{item.jobTitle}</h3></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{item.status==='accepted'?'Accord enregistré':item.status==='declined'?'Projet refusé':'À examiner'}</span></div>
      <p className="text-sm">{item.firstName} {item.lastName} · {item.workLocation}<br/>Prise d’effet : {item.startDate}{item.kind==='CDD'&&` · Fin indiquée : ${item.endDate}`}<br/>Rémunération déclarée : {item.salary} {item.currency} (périodicité dans les clauses)</p>
      <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border bg-muted/30 p-4 text-sm leading-6" aria-label="Clauses du contrat">{item.clauses}</div>
      <button type="button" disabled={!!busy} onClick={()=>void download(item.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"><Download className="h-4 w-4"/>Télécharger {item.status==='accepted'?'l’exemplaire accepté':'le projet PDF'}</button>
      {item.status==='proposed'&&<div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-bold">Lisez intégralement les clauses et le PDF avant de donner votre accord.</p>
        <p>Votre signature dessinée et votre nom saisi constituent une trace d’accord visuel interne, pas une signature électronique qualifiée. En cas de désaccord, contactez la gestion RH et ne validez pas ce projet.</p>
        <label className="block font-semibold">Saisissez votre nom complet : {item.firstName} {item.lastName}<input maxLength={120} value={signature[item.id]??''} onChange={e=>setSignature(current=>({...current,[item.id]:e.target.value}))} className="mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-foreground" autoComplete="name" /></label>
        <VisualSignature disabled={!!busy} onChange={png=>setSignatureImages(current=>({...current,[item.id]:png}))}/>
        <label className="flex items-start gap-2"><input type="checkbox" checked={consents[item.id]??false} onChange={e=>setConsents(current=>({...current,[item.id]:e.target.checked}))} className="mt-1"/> J’ai lu ce contrat et je consens explicitement à enregistrer mon accord visuel sur cette version.</label>
        <button type="button" disabled={!!busy||!consents[item.id]||!signature[item.id]?.trim()||!signatureImages[item.id]} onClick={()=>void accept(item)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-foreground disabled:opacity-50"><CheckCircle2 className="h-4 w-4"/>{busy===item.id?'Enregistrement…':'Accepter cette version'}</button>
      </div>}
      {item.status==='proposed'&&<button type="button" disabled={!!busy} onClick={()=>void decline(item)} className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Refuser ce projet</button>}
      {item.status==='accepted'&&<p className="text-xs text-muted-foreground">Accord enregistré le {new Date(item.acceptedAt!).toLocaleString('fr-FR')}. Une correction nécessite un nouveau contrat ; cette version n’est plus modifiable.</p>}
    </article>)}
  </div>;
}
