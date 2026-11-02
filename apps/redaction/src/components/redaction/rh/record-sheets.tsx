'use client';

import { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useRhNotice } from './use-rh-notice';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { kinshasaToday } from '@/lib/redaction/rh/activities';
import { parseSheetFilter, type SheetType } from '@/lib/redaction/rh/record-sheets';
import type { SheetData } from '@/lib/redaction/rh/record-sheet-pdf';

const titles: Record<SheetType,string> = { presence:'Présence', prestations:'Prestations', paiements:'Paiements' };
async function savePdf(blob:Blob,filename:string):Promise<'saved'|'cancelled'> {
  const file=new File([blob],filename,{type:'application/pdf'});
  if(/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) && navigator.share && navigator.canShare?.({files:[file]})) {
    try {await navigator.share({files:[file],title:'Fiche RH'});return 'saved';}
    catch(e){if(e instanceof DOMException && e.name==='AbortError')return 'cancelled';}
  }
  const bridge=(window as unknown as {AndroidBridge?:{savePdf?:(base64:string,name:string)=>void}}).AndroidBridge;
  if(bridge?.savePdf){const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]??'');reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});bridge.savePdf(base64,filename);return 'saved';}
  const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60_000);return 'saved';
}

export function RecordSheets({ type: fixedType, admin = false, allowPayments = true }: { type?: SheetType; admin?: boolean; allowPayments?: boolean }) {
  const today=kinshasaToday();
  const [type,setType]=useState<SheetType>(fixedType??'presence');
  const [start,setStart]=useState(`${today.slice(0,4)}-01-01`);
  const [end,setEnd]=useState(today);
  const [person,setPerson]=useState('');
  const [people,setPeople]=useState<{id:string;firstName:string;lastName:string;startDate:string|null;archived:boolean}[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useRhNotice('error');
  const [message,setMessage]=useRhNotice('success');
  useEffect(()=>{if(!admin)return;const controller=new AbortController();fetchRedaction('/api/redaction/rh/collaborateurs',{cache:'no-store',signal:controller.signal})
    .then(async r=>{if(!r.ok)throw new Error('Liste des collaborateurs indisponible.');setPeople((await r.json()).collaborators??[]);})
    .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Liste indisponible.');});return ()=>controller.abort();},[admin,setError]);
  async function submit(action:'download'|'print'){ setError('');setMessage('');
    if(admin&&!person){setError('Sélectionnez un collaborateur.');return;}
    const filter=parseSheetFilter({type,start,end,...(admin?{collaboratorId:person}:{})});
    if(!filter){setError('Sélectionnez une période valide d’un an maximum.');return;}
    // Ouvrir pendant le geste utilisateur, avant les requêtes asynchrones (blocage anti-popup).
    const viewer=action==='print'?window.open('about:blank','_blank'):null;
    if(viewer){viewer.opener=null;viewer.document.title='Préparation de la fiche RH';viewer.document.body.textContent='Préparation de la fiche RH…';}
    setBusy(true);
    try {
      const response=await fetchRedaction('/api/redaction/rh/fiches-exports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(filter),cache:'no-store'});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Fiche indisponible.');
      const { buildRecordSheetPdf }=await import('@/lib/redaction/rh/record-sheet-pdf');
      const blob=await buildRecordSheetPdf(data as SheetData);
      const url=action==='print'&&viewer?URL.createObjectURL(blob):null;
      if(action==='print' && viewer && !viewer.closed){viewer.location.href=url!;viewer.addEventListener('load',()=>{try{viewer.print();}catch{}},{once:true});window.setTimeout(()=>URL.revokeObjectURL(url!),600_000);setMessage('Fiche ouverte : utilisez « Imprimer » dans le lecteur PDF si la fenêtre ne démarre pas automatiquement.');}
      else {const saved=await savePdf(blob,`fiche-rh-${type}-${start}-${end}.pdf`);if(saved==='saved')setMessage(action==='print'?'Fenêtre bloquée : choisissez le fichier enregistré pour l’imprimer.':'Fiche PDF prête. Classez-la dans un espace sécurisé.');}

    } catch(e){if(viewer&&!viewer.closed)viewer.close();setError(e instanceof Error?e.message:'Impossible de générer le PDF.');}
    finally{setBusy(false);}
  }
  return <section className="space-y-3 rounded-2xl border border-border bg-card p-5 print:hidden">
    <h2 className="font-display text-lg font-bold">Fiche RH à classer · {titles[type]}</h2>
    <p className="text-xs text-muted-foreground">PDF A4 avec entête et pied de page de l’entreprise. La période sélectionnée est complète (jusqu’à 5 000 entrées), indépendante des aperçus récents. Exports consignés ; ne laissez pas ces documents confidentiels sur un appareil partagé.</p>
    <form onSubmit={e=>{e.preventDefault();void submit('download');}} className="flex flex-wrap items-end gap-3">
      {!fixedType&&<label className="text-xs font-medium">Fiche<select value={type} onChange={e=>setType(e.target.value as SheetType)} className="mt-1 block rounded-lg border border-border bg-background p-2">{Object.entries(titles).filter(([key])=>allowPayments||key!=='paiements').map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>}
      {admin&&<label className="text-xs font-medium">Collaborateur<select value={person} required onChange={e=>{setPerson(e.target.value);const selected=people.find(p=>p.id===e.target.value);if(selected?.startDate) setStart(selected.startDate > `${today.slice(0,4)}-01-01` ? selected.startDate : `${today.slice(0,4)}-01-01`);}} className="mt-1 block max-w-64 rounded-lg border border-border bg-background p-2"><option value="">Sélectionner…</option>{people.map(p=><option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.archived?' (archivé)':''}</option>)}</select></label>}
      <label className="text-xs font-medium">Du<input type="date" required min="1900-01-01" value={start} onChange={e=>setStart(e.target.value)} className="mt-1 block rounded-lg border border-border bg-background p-2" /></label>
      <label className="text-xs font-medium">Au<input type="date" required min={start||'1900-01-01'} max={today} value={end} onChange={e=>setEnd(e.target.value)} className="mt-1 block rounded-lg border border-border bg-background p-2" /></label>
      <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"><Download className="h-4 w-4" />Télécharger</button>
      <button type="button" disabled={busy} onClick={()=>void submit('print')} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-50"><Printer className="h-4 w-4" />Ouvrir / imprimer</button>
    </form>
    {error&&<p role="alert" className="text-xs text-red-700 dark:text-red-300">{error}</p>}{message&&<p role="status" className="text-xs text-primary">{message}</p>}
    {type==='prestations'&&<p className="text-xs text-muted-foreground">Les relevés administratifs et les déclarations collaborateurs sont distingués ; « à vérifier » ne signifie pas validé.</p>}
    {type==='paiements'&&<p className="text-xs text-muted-foreground">Paiements enregistrés et déclarations anciennes sont distincts. Les montants à vérifier ne sont pas inclus dans les totaux ; les rapprochements ne sont pas comptés deux fois.</p>}
  </section>;
}
