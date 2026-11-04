'use client';

import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { Crop, Download, ImageDown, Maximize2, Printer, ShieldCheck } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { DEFAULT_ORGANIZATION_SETTINGS } from '@/lib/redaction/rh/organization';
import QRCode from 'qrcode';
import { createOrganizationQr } from '@/lib/redaction/rh/organization-qr';
import { renderServiceCardSheet, type PhotoCrop, type ServiceCardData } from '@/lib/redaction/rh/service-card-export';
import { PressPhotoCrop } from './press-photo-crop';

async function deliver(blob:Blob,filename:string) {
  const file=new File([blob],filename,{type:blob.type});
  if(/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) && navigator.share && navigator.canShare?.({files:[file]})) {
    try {await navigator.share({files:[file],title:'Carte de service'});return;}
    catch(error){if(error instanceof DOMException && error.name==='AbortError')return;}
  }
  const bridge=(window as unknown as {AndroidBridge?:{savePdf?:(data:string,name:string)=>void}}).AndroidBridge;
  if(blob.type==='application/pdf' && bridge?.savePdf) {
    const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]??'');reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
    bridge.savePdf(base64,filename);return;
  }
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30_000);
}

export function ServiceCard({adminPersonId}:{adminPersonId?:string}) {
  const endpoint=adminPersonId?`/api/redaction/rh/cartes/${adminPersonId}`:'/api/redaction/rh/mon-espace/carte-service';
  const [card,setCard]=useState<ServiceCardData|null>(null);
  const [companyName,setCompanyName]=useState('');
  const [companyWebsite,setCompanyWebsite]=useState(''),[companyEmail,setCompanyEmail]=useState('');
  const [directorName,setDirectorName]=useState(''),[directorTitle,setDirectorTitle]=useState('');
  const [seal,setSeal]=useState(''),[directorSignature,setDirectorSignature]=useState('');
  const [companyQr,setCompanyQr]=useState('');
  const [logo,setLogo]=useState('/logo.png');
  const [loading,setLoading]=useState(true),[ready,setReady]=useState(false),[busy,setBusy]=useState(false);
  const [preview,setPreview]=useState<string|null>(null),[error,setError]=useState(''),[zoomed,setZoomed]=useState(false);
  const [photoCrop,setPhotoCrop]=useState<PhotoCrop>({zoom:1,x:0,y:0}),[cropping,setCropping]=useState(false);
  useEffect(()=>{
    let active=true;
    setLoading(true);setReady(false);setError('');
    void Promise.all([
      fetchRedaction(endpoint,{cache:'no-store'}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||'Carte indisponible.');return data.card as ServiceCardData|null;}),
      fetchRedaction('/api/redaction/rh/organisation',{cache:'no-store'}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||'Identité de l’entreprise indisponible.');return {...DEFAULT_ORGANIZATION_SETTINGS,...data.settings};}),
      ...(['company-logo','company-seal','director-signature'] as const).map(key=>fetchRedaction(`/api/redaction/rh/organisation/assets/${key}`,{cache:'no-store'}).then(async response=>response.ok?(await response.json()).asset as string|null:null).catch(()=>null)),
    ]).then(async ([item,settings,logoAsset,sealAsset,signatureAsset])=>{
      const qr=item?.cardType==='press' ? await QRCode.toDataURL(item.verificationUrl||'',{errorCorrectionLevel:'H',margin:4,width:512}) : await createOrganizationQr(settings);
      if(!active)return;
      setCard(item);setCompanyName(settings.companyName);setCompanyWebsite(settings.companyWebsite);setCompanyEmail(settings.companyEmail);
      setDirectorName(settings.directorName);setDirectorTitle(settings.directorTitle);
      setCompanyQr(qr);setLogo(logoAsset||'/logo.png');setSeal(sealAsset||'');setDirectorSignature(signatureAsset||'');setReady(true);
    })
      .catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Chargement impossible.');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[endpoint]);
  useEffect(()=>{
    setPhotoCrop({zoom:1,x:0,y:0});
    if(!card?.photo||card.cardType!=='press')return;
    try {
      const saved=JSON.parse(localStorage.getItem(`rh-press-crop:${card.id}`)||'null');
      if(saved?.photoStamp===`${card.photo.length}:${card.photo.slice(-48)}` && saved.crop && [saved.crop.zoom,saved.crop.x,saved.crop.y].every(Number.isFinite))
        setPhotoCrop({zoom:Math.min(3,Math.max(1,saved.crop.zoom)),x:Math.min(1,Math.max(-1,saved.crop.x)),y:Math.min(1,Math.max(-1,saved.crop.y))});
    }catch {/* Stockage local indisponible : cadrage d’origine. */}
  },[card?.id,card?.photo,card?.cardType]);
  function applyCrop(crop:PhotoCrop){
    if(!card?.photo)return;
    setPhotoCrop(crop);setCropping(false);setPreview(null);
    try {localStorage.setItem(`rh-press-crop:${card.id}`,JSON.stringify({photoStamp:`${card.photo.length}:${card.photo.slice(-48)}`,crop}));}catch {/* L’aperçu reste utilisable dans cette session. */}
  }
  function pageData(item:ServiceCardData){return {card:item,photoCrop,companyName,qr:companyQr,logo,companyWebsite,companyEmail,directorName,directorTitle,seal,directorSignature};}
  useEffect(()=>{
    if(!ready||!card||!companyQr){setPreview(null);return;}
    let active=true;
    const timer=setTimeout(()=>{void renderServiceCardSheet(pageData(card),1)
      .then(canvas=>{if(active){setPreview(canvas.toDataURL('image/jpeg',.9));setError('');}})
      .catch(cause=>{if(active){setPreview(null);setError(cause instanceof Error?cause.message:'Aperçu indisponible.');}});},300);
    return()=>{active=false;clearTimeout(timer);};
  },[ready,card,companyQr,companyName,logo,companyWebsite,companyEmail,directorName,directorTitle,seal,directorSignature,photoCrop]);
  useEffect(()=>{if(!zoomed)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setZoomed(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[zoomed]);

  async function currentCard():Promise<ServiceCardData> {
    const response=await fetchRedaction(endpoint,{cache:'no-store'});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Vérification de la carte impossible.');
    if(!data.card || data.card.id!==card?.id) {setCard(data.card??null);throw new Error('Carte révoquée, expirée ou renouvelée : rechargez sa nouvelle version avant l’export.');}
    if(JSON.stringify(data.card)!==JSON.stringify(card)) {setCard(data.card);throw new Error('Les informations de la carte ont changé. Vérifiez le nouvel aperçu avant l’export.');}
    const identityResponse=await fetchRedaction('/api/redaction/rh/organisation',{cache:'no-store'});
    if(!identityResponse.ok)throw new Error('Identité de l’entreprise indisponible.');
    const identity=(await identityResponse.json()).settings;
    const settings={...DEFAULT_ORGANIZATION_SETTINGS,...identity};
    const freshQr=data.card.cardType==='press' ? await QRCode.toDataURL(data.card.verificationUrl||'',{errorCorrectionLevel:'H',margin:4,width:512}) : await createOrganizationQr(settings);
    if(settings.companyName!==companyName || settings.companyWebsite!==companyWebsite || settings.companyEmail!==companyEmail || settings.directorName!==directorName || settings.directorTitle!==directorTitle || freshQr!==companyQr){setCompanyName(settings.companyName);setCompanyWebsite(settings.companyWebsite);setCompanyEmail(settings.companyEmail);setDirectorName(settings.directorName);setDirectorTitle(settings.directorTitle);setCompanyQr(freshQr);throw new Error('L’identité de l’entreprise a changé. Vérifiez le nouvel aperçu avant l’export.');}
    const logoResponse=await fetchRedaction('/api/redaction/rh/organisation/assets/company-logo',{cache:'no-store'});
    if(!logoResponse.ok)throw new Error('Logo de l’entreprise indisponible.');
    const freshLogo=(await logoResponse.json()).asset||'/logo.png';
    const [sealResponse,signatureResponse]=await Promise.all(['company-seal','director-signature'].map(key=>fetchRedaction(`/api/redaction/rh/organisation/assets/${key}`,{cache:'no-store'})));
    if(!sealResponse.ok||!signatureResponse.ok)throw new Error('Visuels du signataire indisponibles.');
    const freshSeal=(await sealResponse.json()).asset||'',freshSignature=(await signatureResponse.json()).asset||'';
    if(freshLogo!==logo || freshSeal!==seal || freshSignature!==directorSignature){setLogo(freshLogo);setSeal(freshSeal);setDirectorSignature(freshSignature);throw new Error('Les visuels ont changé. Vérifiez le nouvel aperçu avant l’export.');}
    return data.card;
  }
  function filename(item:ServiceCardData){return `${item.cardType==='press'?'carte-presse':'carte-service'}-${item.cardNumber.replace(/[^a-z0-9_-]+/gi,'-')}`;}
  async function exportFile(type:'pdf'|'png') {
    if(!ready||!card)return;
    setBusy(true);setError('');
    try {
      const current=await currentCard();
      const canvas=await renderServiceCardSheet(pageData(current));
      if(type==='pdf'){
        const {jsPDF}=await import('jspdf');const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});
        pdf.addImage(canvas.toDataURL('image/jpeg',.94),'JPEG',0,0,210,297,undefined,'FAST');
        await deliver(pdf.output('blob'),`${filename(current)}.pdf`);
      } else {
        const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('PNG indisponible.')),'image/png'));
        await deliver(blob,`${filename(current)}-300dpi.png`);
      }
    } catch(cause){setError(cause instanceof Error?cause.message:'Export impossible.');}
    finally{setBusy(false);}
  }
  async function printSheet() {
    if(!ready||!card)return;
    setBusy(true);setError('');
    try {
      const current=await currentCard(),mobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
      const canvas=await renderServiceCardSheet(pageData(current),mobile?3:1.5);
      if(mobile){
        const {jsPDF}=await import('jspdf');const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});
        pdf.addImage(canvas.toDataURL('image/jpeg',.94),'JPEG',0,0,210,297,undefined,'FAST');
        await deliver(pdf.output('blob'),`${filename(current)}.pdf`);
        setError('Ouvrez le PDF A4 partagé ou enregistré avec une application pouvant imprimer ; choisissez la taille réelle (100 %).');return;
      }
      const url=canvas.toDataURL('image/jpeg',.9);
      await new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve();img.onerror=()=>reject(new Error('Aperçu indisponible.'));img.src=url;});
      flushSync(()=>setPreview(url));window.print();
    } catch(cause){setError(cause instanceof Error?cause.message:'Impression impossible.');}
    finally{setBusy(false);}
  }
  if(loading)return <p className="p-4 text-sm text-muted-foreground">Chargement de la carte…</p>;
  if(!card)return <section className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">{error||'Aucune carte de service active. L’administration vous notifiera lorsqu’elle sera disponible.'}</section>;
  return <div className="mx-auto max-w-4xl space-y-4 p-2 sm:p-4">
    <header className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"><ShieldCheck className="h-6 w-6 text-primary"/><div><h1 className="font-bold">{card.cardType==='press'?'Carte de presse · recto et verso':'Carte de service · recto et verso'}</h1><p className="text-xs text-muted-foreground">Planche A4 d’une page avec deux faces {card.cardType==='press'?'portrait 54 × 85,6 mm':'85,6 × 54 mm'}. Découpez et assemblez dos à dos ; ce n’est pas une impression recto-verso automatique.</p></div></header>
    <div className="flex flex-wrap justify-end gap-2 print:hidden">
      {card.cardType==='press' && card.photo && <button type="button" disabled={busy} onClick={()=>setCropping(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#1263ab] bg-[#1263ab]/5 px-3 py-2 text-sm font-semibold text-[#0b437d] disabled:opacity-50"><Crop className="h-4 w-4"/>Recadrer la photo</button>}
      <button type="button" disabled={busy||!preview} onClick={()=>void printSheet()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50"><Printer className="h-4 w-4"/>Imprimer A4</button>
      <button type="button" disabled={busy||!preview} onClick={()=>void exportFile('pdf')} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Download className="h-4 w-4"/>Télécharger PDF</button>
      <button type="button" disabled={busy||!preview} onClick={()=>void exportFile('png')} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50"><ImageDown className="h-4 w-4"/>Télécharger PNG HD (300 dpi)</button>
    </div>
    {error && <p role="status" className={`rounded-lg border p-3 text-sm print:hidden ${error.includes('Ouvrez le PDF')?'border-primary/20 bg-primary/5 text-primary':'border-red-300 bg-red-50 text-red-900'}`}>{error}</p>}
    {preview ? <button type="button" onClick={()=>setZoomed(true)} className="mx-auto block w-full max-w-[210mm] text-left print:contents" aria-label="Agrandir la planche des cartes de service"><img className="service-card-print-page block h-auto w-full bg-white shadow-lg ring-1 ring-black/10 print:shadow-none print:ring-0" src={preview} alt={`Planche A4 recto-verso de la carte de ${card.firstName} ${card.lastName}`} /><span className="mt-2 flex items-center gap-2 text-xs text-muted-foreground print:hidden"><Maximize2 className="h-4 w-4"/>Toucher pour agrandir</span></button> : <div className="mx-auto flex aspect-[210/297] max-w-[210mm] items-center justify-center rounded-lg border bg-white p-5 text-center text-sm text-muted-foreground print:hidden">{error||'Préparation de l’aperçu A4…'}</div>}
    <dl className="sr-only"><div><dt>Titulaire</dt><dd>{card.firstName} {card.lastName}</dd></div><div><dt>Matricule</dt><dd>{card.cardNumber}</dd></div><div><dt>Fonction</dt><dd>{card.jobTitle}</dd></div><div><dt>Émission</dt><dd>{card.issuedAt}</dd></div><div><dt>Expiration</dt><dd>{card.expiresAt}</dd></div></dl>
    {cropping&&card.cardType==='press'&&card.photo&&<PressPhotoCrop photo={card.photo} initial={photoCrop} onApply={applyCrop} onClose={()=>setCropping(false)}/>}
    {zoomed&&preview&&<div role="dialog" aria-modal="true" aria-label="Planche A4 agrandie" className="fixed inset-0 z-[120] overflow-auto bg-black/90 p-4 print:hidden" onMouseDown={event=>{if(event.target===event.currentTarget)setZoomed(false);}}><div className="sticky top-0 z-10 mb-3 flex justify-end"><button type="button" onClick={()=>setZoomed(false)} className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-black">Fermer</button></div><img src={preview} alt="Recto et verso à taille réelle sur une page A4" className="mx-auto h-auto min-w-[826px] max-w-[826px] bg-white"/></div>}
    <style jsx global>{`@media print { @page {size:A4;margin:0;}html,body{height:297mm!important;overflow:hidden!important;}body *{visibility:hidden!important;}.service-card-print-page{visibility:visible!important;position:fixed!important;top:0!important;left:0!important;width:210mm!important;height:297mm!important;max-width:none!important;margin:0!important;} }`}</style>
  </div>;
}
