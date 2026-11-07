'use client';
import { useRef, useState } from 'react';

/** Signature manuscrite locale : aucun trait n'est envoyé avant le consentement explicite. */
export function VisualSignature({ onChange, disabled }: { onChange: (png: string | null) => void; disabled?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk,setHasInk] = useState(false);
  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x:(event.clientX-bounds.left)*event.currentTarget.width/bounds.width, y:(event.clientY-bounds.top)*event.currentTarget.height/bounds.height };
  }
  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled || (event.pointerType==='mouse' && event.button!==0)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const ctx=canvas.current?.getContext('2d');if(!ctx)return;
    const p=point(event);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.2,p.y+.2);ctx.strokeStyle='#1c2635';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();drawing.current=true;setHasInk(true);
  }
  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if(!drawing.current || disabled)return;
    const ctx=canvas.current?.getContext('2d');if(!ctx)return;
    const p=point(event);ctx.lineTo(p.x,p.y);ctx.stroke();
  }
  function finish(event: React.PointerEvent<HTMLCanvasElement>) {
    if(!drawing.current)return;
    drawing.current=false;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    onChange(canvas.current?.toDataURL('image/png')??null);
  }
  function upload(file: File | undefined) {
    if (!file || !file.type.startsWith('image/') || file.size > 200_000) { clear(); return; }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const el=canvas.current, ctx=el?.getContext('2d');
      if (el && ctx && image.naturalWidth > 0 && image.naturalHeight > 0 && image.naturalWidth * image.naturalHeight <= 500_000) {
        ctx.clearRect(0,0,el.width,el.height);
        const ratio=Math.min(el.width/image.naturalWidth,el.height/image.naturalHeight);
        const w=image.naturalWidth*ratio,h=image.naturalHeight*ratio;
        ctx.drawImage(image,(el.width-w)/2,(el.height-h)/2,w,h);
        setHasInk(true); onChange(el.toDataURL('image/png'));
      } else clear();
      URL.revokeObjectURL(url);
    };
    image.onerror=()=>{ URL.revokeObjectURL(url); clear(); };
    image.src=url;
  }
  function clear() {
    const el=canvas.current;if(el)el.getContext('2d')?.clearRect(0,0,el.width,el.height);
    setHasInk(false);onChange(null);
  }
  return <div><p className="font-semibold">Dessinez ou insérez votre signature dans le cadre :</p><canvas ref={canvas} width={560} height={160} role="img" aria-label="Zone de signature manuscrite, tactile ou à la souris" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} className="mt-2 h-40 w-full touch-none rounded-lg border border-amber-600 bg-white" style={{cursor:disabled?'not-allowed':'crosshair'}}/><label className="mt-2 block text-xs font-medium">Importer une image de signature (PNG ou JPEG, 200 Ko maximum)<input type="file" accept="image/png,image/jpeg" disabled={disabled} onChange={e=>{upload(e.target.files?.[0]);e.target.value='';}} className="mt-1 block w-full text-xs" /></label><button type="button" disabled={disabled||!hasInk} onClick={clear} className="mt-1 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50">Effacer la signature</button></div>;
}
