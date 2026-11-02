'use client';

import { useEffect, useState } from 'react';
import { Download, ExternalLink, Printer, Copy } from 'lucide-react';
import { useRhNotice } from './use-rh-notice';
import { fetchRedaction, redactionPublicPath } from '@/lib/redaction/public-path';
import { kinshasaToday } from '@/lib/redaction/rh/activities';
import { parseSheetFilter, type SheetType } from '@/lib/redaction/rh/record-sheets';
import type { SheetData } from '@/lib/redaction/rh/record-sheet-pdf';

const titles: Record<SheetType,string> = { presence:'Présence', prestations:'Prestations', paiements:'Paiements' };
type NativePdfBridge = { openExternalUrl?: (url:string)=>void; openExternal?: (url:string)=>void };

export function RecordSheets({ type: fixedType, admin = false, allowPayments = true }: { type?: SheetType; admin?: boolean; allowPayments?: boolean }) {
  const today=kinshasaToday();
  const [type,setType]=useState<SheetType>(fixedType??'presence');
  const [start,setStart]=useState(`${today.slice(0,4)}-01-01`);
  const [end,setEnd]=useState(today);
  const [person,setPerson]=useState('');
  const [people,setPeople]=useState<{id:string;firstName:string;lastName:string;startDate:string|null;archived:boolean}[]>([]);
  const [busy,setBusy]=useState(false);
  const [browserUrl,setBrowserUrl]=useState('');
  const [error,setError]=useRhNotice('error');
  const [message,setMessage]=useRhNotice('success');
  useEffect(()=>{if(!admin)return;const controller=new AbortController();fetchRedaction('/api/redaction/rh/collaborateurs',{cache:'no-store',signal:controller.signal})
    .then(async r=>{if(!r.ok)throw new Error('Liste des collaborateurs indisponible.');setPeople((await r.json()).collaborators??[]);})
    .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Liste indisponible.');});return ()=>controller.abort();},[admin,setError]);
  useEffect(()=>{if(!browserUrl)return;const timeout=window.setTimeout(()=>setBrowserUrl(''),600_000);return ()=>window.clearTimeout(timeout);},[browserUrl]);

  async function prepare(action:'download'|'print'){
    setError('');setMessage('');setBrowserUrl('');
    if(admin&&!person){setError('Sélectionnez un collaborateur.');return;}
    const filter=parseSheetFilter({type,start,end,...(admin?{collaboratorId:person}:{})});
    if(!filter){setError('Sélectionnez une période valide d’un an maximum.');return;}
    setBusy(true);
    try {
      const response=await fetchRedaction('/api/redaction/rh/fiches-exports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(filter),cache:'no-store'});
      const data=await response.json() as SheetData & {exportId:string};
      if(!response.ok)throw new Error((data as unknown as {error?:string}).error||'Fiche indisponible.');
      const { buildRecordSheetPdf }=await import('@/lib/redaction/rh/record-sheet-pdf');
      const blob=await buildRecordSheetPdf(data);
      // Un blob: appartient à la WebView de l'APK et ne s'ouvre pas dans Chrome.
      // Une URL HTTPS courte, sans cookie, permet au navigateur externe de lire ce PDF.
      const query=new URLSearchParams({exportId:String(data.exportId),type,...(admin?{collaboratorId:person}:{})});
      const linkResponse=await fetchRedaction(`/api/redaction/rh/fiches-exports/lien?${query}`,{method:'POST',headers:{'Content-Type':'application/pdf'},body:blob,cache:'no-store'});
      const linkData=await linkResponse.json();
      if(!linkResponse.ok)throw new Error(linkData.error||'Lien PDF indisponible.');
      const url=new URL(redactionPublicPath(`/api/redaction/rh/fiches-exports/lien/${linkData.token}`),window.location.href).href;
      setBrowserUrl(url);
      if(action==='download' && !(window as unknown as {AndroidBridge?:NativePdfBridge}).AndroidBridge){
        const local=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=local;anchor.download=`fiche-rh-${type}-${start}-${end}.pdf`;document.body.append(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(local),60_000);
        setMessage('Fiche téléchargée. Elle peut également être ouverte dans le navigateur ci-dessous.');
      }else setMessage('Fiche prête. Ouvrez son lien HTTPS dans votre navigateur pour imprimer ou enregistrer le PDF. Lien valable 10 minutes.');
    }catch(e){setError(e instanceof Error?e.message:'Impossible de préparer le PDF.');}
    finally{setBusy(false);}
  }

  async function copyLink(){try{await navigator.clipboard.writeText(browserUrl);setMessage('Lien copié. Collez-le dans Chrome ou votre navigateur externe (valable 10 minutes).');}catch{setError('Copie impossible : sélectionnez le lien ci-dessous et copiez-le manuellement.');}}
  async function openLink(event:React.MouseEvent<HTMLAnchorElement>){
    const bridge=(window as unknown as {AndroidBridge?:NativePdfBridge}).AndroidBridge;
    if(!bridge)return; // Sur le Web, l'URL HTTPS s'ouvre directement dans un nouvel onglet.
    event.preventDefault();
    try {
      if(bridge.openExternalUrl){bridge.openExternalUrl(browserUrl);return;}
      if(bridge.openExternal){bridge.openExternal(browserUrl);return;}
      // L'APK peut ne pas implémenter l'ouverture externe. Ne pas ouvrir une page WebView vide.
      if(navigator.share){await navigator.share({title:'Fiche RH PDF',url:browserUrl});return;}
      await copyLink();
    }catch(e){if(e instanceof DOMException&&e.name==='AbortError')return;await copyLink();}
  }

  return <section className="space-y-3 rounded-2xl border border-border bg-card p-5 print:hidden">
    <h2 className="font-display text-lg font-bold">Fiche RH à classer · {titles[type]}</h2>
    <p className="text-xs text-muted-foreground">PDF A4 avec entête et pied de page de l’entreprise. La période sélectionnée est complète (jusqu’à 5 000 entrées), indépendante des aperçus récents. Exports consignés ; ne laissez pas ces documents confidentiels sur un appareil partagé.</p>
    <form onSubmit={e=>{e.preventDefault();void prepare('download');}} className="flex flex-wrap items-end gap-3">
      {!fixedType&&<label className="text-xs font-medium">Fiche<select value={type} onChange={e=>{setType(e.target.value as SheetType);setBrowserUrl('');}} className="mt-1 block rounded-lg border border-border bg-background p-2">{Object.entries(titles).filter(([key])=>allowPayments||key!=='paiements').map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>}
      {admin&&<label className="text-xs font-medium">Collaborateur<select value={person} required onChange={e=>{setPerson(e.target.value);setBrowserUrl('');const selected=people.find(p=>p.id===e.target.value);if(selected?.startDate)setStart(selected.startDate > `${today.slice(0,4)}-01-01` ? selected.startDate : `${today.slice(0,4)}-01-01`);}} className="mt-1 block max-w-64 rounded-lg border border-border bg-background p-2"><option value="">Sélectionner…</option>{people.map(p=><option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.archived?' (archivé)':''}</option>)}</select></label>}
      <label className="text-xs font-medium">Du<input type="date" required min="1900-01-01" value={start} onChange={e=>{setStart(e.target.value);setBrowserUrl('');}} className="mt-1 block rounded-lg border border-border bg-background p-2" /></label>
      <label className="text-xs font-medium">Au<input type="date" required min={start||'1900-01-01'} max={today} value={end} onChange={e=>{setEnd(e.target.value);setBrowserUrl('');}} className="mt-1 block rounded-lg border border-border bg-background p-2" /></label>
      <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"><Download className="h-4 w-4" />Préparer / télécharger</button>
      <button type="button" disabled={busy} onClick={()=>void prepare('print')} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-50"><Printer className="h-4 w-4" />Préparer pour imprimer</button>
    </form>
    {error&&<p role="alert" className="text-xs text-red-700 dark:text-red-300">{error}</p>}{message&&<p role="status" className="text-xs text-primary">{message}</p>}
    {browserUrl&&<div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm"><p className="font-semibold">Fiche prête · lien confidentiel valable 10 minutes</p><div className="flex flex-wrap gap-2"><a href={browserUrl} target="_blank" rel="noopener noreferrer" onClick={e=>void openLink(e)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"><ExternalLink className="h-4 w-4" />Ouvrir dans un navigateur / imprimer</a><button type="button" onClick={()=>void copyLink()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs"><Copy className="h-4 w-4" />Copier le lien</button></div><input aria-label="Lien PDF à ouvrir dans un navigateur externe" readOnly value={browserUrl} onFocus={e=>e.target.select()} className="w-full rounded-lg border border-border bg-background p-2 text-xs" /><p className="text-xs text-muted-foreground">Dans l’APK, si l’ouverture directe n’est pas proposée, partagez le lien vers Chrome ou copiez-collez-le dans un navigateur. Ne le transmettez pas à une personne non autorisée.</p></div>}
    {type==='prestations'&&<p className="text-xs text-muted-foreground">Les relevés administratifs et les déclarations collaborateurs sont distingués ; « à vérifier » ne signifie pas validé.</p>}
    {type==='paiements'&&<p className="text-xs text-muted-foreground">Paiements enregistrés et déclarations anciennes sont distincts. Les montants à vérifier ne sont pas inclus dans les totaux ; les rapprochements ne sont pas comptés deux fois.</p>}
  </section>;
}
