'use client';

import { useEffect, useRef, useState } from 'react';
import { drawCroppedPhoto, photoPlacement, type PhotoCrop } from '@/lib/redaction/rh/service-card-export';

const SIZE=260;
const INNER=240;
const clamp=(value:number)=>Math.max(-1,Math.min(1,value));

/** Le cadrage modifie seulement le visuel de cette carte, jamais les actifs RH de l'entreprise. */
export function PressPhotoCrop({photo,initial,onApply,onClose,mode='photo',baseLogo}:{photo:string;initial:PhotoCrop;onApply:(crop:PhotoCrop,source:string)=>void;onClose:()=>void;mode?:'photo'|'logo';baseLogo?:string}){
  const [source,setSource]=useState(photo);
  const [fileError,setFileError]=useState('');
  const [crop,setCrop]=useState<PhotoCrop>(initial);
  const [image,setImage]=useState<HTMLImageElement|null>(null);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const closeRef=useRef<HTMLButtonElement>(null);
  const drag=useRef<{x:number;y:number;crop:PhotoCrop}|null>(null);
  useEffect(()=>{const img=new Image();let active=true;img.onload=()=>{if(active){setImage(img);setFileError('');}};img.onerror=()=>{if(active){setImage(null);setFileError('Image illisible. Choisissez un autre fichier.');}};img.src=source;return()=>{active=false;};},[source]);
  async function changeLogo(file:File|undefined){
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2_000_000){setFileError('Choisissez un logo JPG, PNG ou WebP de 2 Mo maximum.');return;}
    const url=URL.createObjectURL(file);
    try {
      const img=new Image();await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error('Fichier image illisible.'));img.src=url;});
      if(!img.naturalWidth||!img.naturalHeight||Math.max(img.naturalWidth,img.naturalHeight)>5000)throw new Error('Logo illisible ou dimensions trop grandes (5 000 pixels maximum).');
      const scale=Math.min(1,600/Math.max(img.naturalWidth,img.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Éditeur d’image indisponible.');
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const value=canvas.toDataURL('image/png');
      if(value.length>1_500_000)throw new Error('Logo trop volumineux après redimensionnement. Choisissez une image plus légère.');
      setSource(value);setCrop({zoom:1,x:0,y:0});setFileError('');
    }catch(error){setFileError(error instanceof Error?error.message:'Logo illisible.');}
    finally{URL.revokeObjectURL(url);}
  }
  useEffect(()=>{closeRef.current?.focus();const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[onClose]);
  useEffect(()=>{
    const ctx=canvasRef.current?.getContext('2d');if(!ctx)return;
    ctx.clearRect(0,0,SIZE,SIZE);ctx.fillStyle='#e6eef7';ctx.fillRect(0,0,SIZE,SIZE);
    ctx.save();ctx.beginPath();ctx.arc(SIZE/2,SIZE/2,INNER/2,0,Math.PI*2);ctx.clip();
    if(image)drawCroppedPhoto(ctx,image,10,10,INNER,INNER,crop);
    ctx.restore();ctx.strokeStyle='#07508b';ctx.lineWidth=5;ctx.beginPath();ctx.arc(SIZE/2,SIZE/2,INNER/2,0,Math.PI*2);ctx.stroke();
  },[crop,image]);
  return <div role="dialog" aria-modal="true" aria-labelledby="press-crop-title" className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/80 p-3 print:hidden" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4"><div><h2 id="press-crop-title" className="text-lg font-bold">{mode==='logo'?'Changer et recadrer le logo':'Recadrer la photo sur la carte'}</h2><p className="mt-1 text-sm text-slate-600">{mode==='logo'?'Choisissez un logo pour cette carte ou ajustez le logo actuel. Le logo officiel de l’entreprise reste intact.':'Glissez la photo dans le cercle ou réglez le zoom et sa position. La photo de la fiche RH reste intacte.'}</p></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Fermer le recadrage" className="rounded-lg border px-3 py-1.5 text-sm font-semibold">✕</button></div>
      <canvas ref={canvasRef} width={SIZE} height={SIZE} role="img" aria-label={mode==='logo'?'Aperçu du cadrage circulaire du logo':'Aperçu du cadrage circulaire de la photo'} className="mx-auto block h-[260px] w-[260px] max-w-full touch-none rounded-xl shadow-sm" onPointerDown={event=>{drag.current={x:event.clientX,y:event.clientY,crop};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={event=>{if(!drag.current||!image)return;const {x,y,crop:origin}=drag.current;const placement=photoPlacement(image.naturalWidth,image.naturalHeight,INNER,INNER,origin);const horizontal=(placement.width-INNER)/2,vertical=(placement.height-INNER)/2;setCrop({...origin,x:horizontal>0?clamp(origin.x+(event.clientX-x)/horizontal):0,y:vertical>0?clamp(origin.y+(event.clientY-y)/vertical):0});}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} />
      {mode==='logo'&&<div className="mt-4 flex flex-wrap items-center gap-2"><label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Choisir un logo (JPG, PNG, WebP)<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event=>{void changeLogo(event.target.files?.[0]);event.target.value='';}}/></label>{baseLogo&&<button type="button" onClick={()=>{setSource(baseLogo);setCrop({zoom:1,x:0,y:0});setFileError('');}} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Reprendre le logo officiel</button>}</div>}
      {fileError&&<p role="alert" className="mt-2 text-sm text-red-700">{fileError}</p>}
      <div className="mt-5 space-y-3">{([['Zoom','zoom',1,3,.05],['Horizontal','x',-1,1,.02],['Vertical','y',-1,1,.02]] as const).map(([label,key,min,max,step])=><label key={key} className="flex items-center gap-3 text-sm font-semibold"><span className="w-24 shrink-0">{label}</span><input type="range" min={min} max={max} step={step} value={crop[key]} onChange={event=>setCrop(current=>({...current,[key]:Number(event.target.value)}))} className="min-w-0 flex-1 accent-[#1263ab]" aria-label={label}/><span className="w-10 text-right tabular-nums text-slate-500">{key==='zoom'?`${Math.round(crop.zoom*100)}%`:Math.round(crop[key]*100)}</span></label>)}</div>
      <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={()=>setCrop({zoom:1,x:0,y:0})} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Réinitialiser</button><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Annuler</button><button type="button" disabled={!image} onClick={()=>onApply(crop,source)} className="rounded-lg bg-[#0b437d] px-4 py-2 text-sm font-bold text-white">Appliquer à la carte</button></div>
      <p className="mt-3 text-xs text-slate-500">Ce visuel est enregistré sur cet appareil pour cette carte et repris dans l’aperçu, le PDF, le PNG et l’impression.</p>
    </div>
  </div>;
}
