'use client';
import { useState } from 'react';
import { inNativeRhApp } from '@/lib/redaction/rh/browser-document';

/** Explicit recovery path for older APKs without the external-browser bridge. */
export function BrowserDocumentLink({ url }: { url:string|null }) {
  const [message,setMessage]=useState('');
  if (!url) return null;
  async function open(event:React.MouseEvent<HTMLAnchorElement>) {
    if (!inNativeRhApp()) return;
    event.preventDefault();
    const bridge=(window as unknown as {AndroidBridge?:{openExternalUrl?:(url:string)=>void;openExternal?:(url:string)=>void}}).AndroidBridge;
    if (bridge?.openExternalUrl) { bridge.openExternalUrl(url!); return; }
    if (bridge?.openExternal) { bridge.openExternal(url!); return; }
    if (navigator.share) { try { await navigator.share({url:url!,title:'Document RH'});return; } catch {} }
    setMessage('Copiez ce lien et ouvrez-le dans Chrome ou un autre navigateur.');
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url!);setMessage('Lien copié. Ouvrez-le dans Chrome (valable 10 minutes).'); }
    catch { setMessage('Sélectionnez le lien ci-dessous puis copiez-le manuellement.'); }
  }
  return <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs"><p className="font-semibold">Lien confidentiel valable 10 minutes · ne le partagez pas.</p><div className="mt-2 flex flex-wrap gap-2"><a href={url} target="_blank" rel="noopener noreferrer" onClick={e=>void open(e)} className="rounded-lg bg-primary px-3 py-2 font-bold text-primary-foreground">Ouvrir dans le navigateur / imprimer</a><button type="button" onClick={()=>void copy()} className="rounded-lg border px-3 py-2">Copier le lien</button></div><input readOnly aria-label="Lien temporaire du document RH" value={url} onFocus={e=>e.target.select()} className="mt-2 w-full rounded border bg-background p-2" />{message&&<p role="status" className="mt-2">{message}</p>}</div>;
}
