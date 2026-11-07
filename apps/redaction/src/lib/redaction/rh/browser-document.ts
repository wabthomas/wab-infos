import { fetchRedaction, redactionPublicPath } from '@/lib/redaction/public-path';

type NativeBridge = { openExternalUrl?: (url:string)=>void; openExternal?: (url:string)=>void };
export function inNativeRhApp(): boolean {
  return typeof window !== 'undefined' && (Boolean((window as unknown as {AndroidBridge?:NativeBridge}).AndroidBridge) || /WabRedactionNative/.test(navigator.userAgent));
}

/** Never hand a WebView blob: URL to Chrome: it belongs to the WebView process. */
export async function deliverRhDocument(blob:Blob, name:string, action:'download'|'print'|'open'='download'): Promise<string|null> {
  if (!inNativeRhApp()) {
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),60_000);
    return null;
  }
  const mime=blob.type === 'application/pdf' ? 'application/pdf' : blob.type === 'image/png' ? 'image/png' : blob.type === 'image/jpeg' ? 'image/jpeg' : blob.type.startsWith('text/csv') ? 'text/csv' : null;
  if (!mime) throw new Error('Seuls les documents PDF, PNG, JPEG et CSV peuvent être ouverts dans le navigateur.');
  const response=await fetchRedaction('/api/redaction/rh/navigateur',{method:'POST',headers:{'Content-Type':mime,'X-Document-Name':name},body:blob,cache:'no-store'});
  const data=await response.json();
  if (!response.ok) throw new Error(data.error||'Impossible de préparer le lien navigateur.');
  const url=new URL(redactionPublicPath(`/api/redaction/rh/navigateur/${data.token}`),window.location.href).href;
  const bridge=(window as unknown as {AndroidBridge?:NativeBridge}).AndroidBridge;
  if (bridge?.openExternalUrl) bridge.openExternalUrl(url);
  else if (bridge?.openExternal) bridge.openExternal(url);
  else if (navigator.share) {
    try { await navigator.share({title:action==='print'?'Imprimer le document RH':'Ouvrir le document RH',url}); }
    catch { /* The URL remains visible in the UI for manual opening. */ }
  }
  return url;
}
