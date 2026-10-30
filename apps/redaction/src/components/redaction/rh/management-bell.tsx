'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BellRing, Check } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { managementEventLabel, type ManagementEvent, type ManagementEventType } from '@/lib/redaction/rh/management-notifications';
const endpoint = '/api/redaction/rh/notifications-gestion';
const links: Record<ManagementEventType,string> = {prestation:'/rh#activity',absence:'/rh#leave',retrait:'/rh#withdrawals',contestation:'/rh#access'};
export function useManagementNotifications(enabled: boolean) {
  const [items,setItems] = useState<ManagementEvent[]>([]); const [visible,setVisible] = useState(false); const [error,setError] = useState(false); const [busy,setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!enabled) return;
    try { const r=await fetchRedaction(endpoint,{cache:'no-store'}); if(r.status===403 || r.status===401){setVisible(false);setItems([]);setError(false);return;} if(!r.ok)throw new Error(); const data=await r.json();setItems(data.notifications);setVisible(true);setError(false); }
    catch {setError(true);setVisible(true);}
  },[enabled]);
  useEffect(()=>{if(!enabled)return;void load();const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void load();},30000);const onVisible=()=>{if(document.visibilityState==='visible')void load();};document.addEventListener('visibilitychange',onVisible);return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);};},[enabled,load]);
  const markRead=useCallback(async(id:string)=>{setBusy(id);try{const r=await fetchRedaction(endpoint,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});if(!r.ok)throw new Error();await load();}catch{setError(true);}finally{setBusy(null);}},[load]);
  return {items,visible,error,busy,markRead,load};
}
export function ManagementBell({state}:{state:ReturnType<typeof useManagementNotifications>}) {
  const [open,setOpen]=useState(false);const root=useRef<HTMLDivElement>(null);const unread=state.items.filter(i=>!i.readAt).length;
  useEffect(()=>{if(!open)return;const close=(e:MouseEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close);},[open]);
  if(!state.visible)return null;
  return <div ref={root} className="relative"><button type="button" onClick={()=>setOpen(!open)} aria-label={`Notifications RH${unread ? `, ${unread} non lues parmi les récentes` : ''}`} aria-expanded={open} title="Notifications RH" className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted"><BellRing className="h-5 w-5" />{unread>0&&<span className="absolute right-0 top-0 rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread}</span>}</button>
    {open&&<div className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,90vw)] rounded-2xl border border-border bg-card shadow-xl"><div className="border-b border-border px-4 py-3"><p className="text-sm font-bold">Notifications RH</p><p className="text-xs text-muted-foreground">Nouvelles déclarations et demandes</p></div>{state.error&&<p role="alert" className="px-4 py-2 text-xs text-red-700 dark:text-red-300">Notifications indisponibles. <button onClick={()=>void state.load()} className="underline">Réessayer</button></p>}<div className="max-h-80 overflow-y-auto">{!state.error&&state.items.length===0&&<p className="p-4 text-sm text-muted-foreground">Aucune notification récente.</p>}{state.items.map(item=><article key={item.id} className={`border-b border-border px-4 py-3 ${!item.readAt?'bg-primary/[0.04]':''}`}><Link href={links[item.type]} onClick={()=>setOpen(false)} className="block text-sm font-semibold hover:underline">{managementEventLabel[item.type]}</Link><p className="mt-1 text-xs text-muted-foreground">{new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Kinshasa'}).format(new Date(item.createdAt))} · {item.readAt?'Lue':'Non lue'}</p>{!item.readAt&&<button type="button" disabled={!!state.busy} onClick={()=>void state.markRead(item.id)} className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline disabled:opacity-50"><Check className="h-3 w-3" /> Marquer comme lue</button>}</article>)}</div><p className="p-3 text-xs text-muted-foreground">30 dernières notifications visibles. Actualisation toutes les 30 secondes lorsque l’application est ouverte.</p></div>}
  </div>;
}
