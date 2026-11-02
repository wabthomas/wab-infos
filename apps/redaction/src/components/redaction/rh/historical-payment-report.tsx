'use client';
import { useRhNotice } from './use-rh-notice';

import { useEffect, useState, type FormEvent } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { formatMinorUnits } from '@/lib/redaction/rh/money';
import { isValidDate, kinshasaToday } from '@/lib/redaction/rh/activities';

type Total = { period:string; currency:'USD'|'CDF'; recordedMinor:string; verifiedHistoricalMinor:string; pendingMinor:string; totalVerifiedMinor:string; matchedCount:number };
export function HistoricalPaymentReport() {
  const today = kinshasaToday();
  const [start,setStart] = useState(`${today.slice(0,4)}-01-01`);
  const [end,setEnd] = useState(today);
  const [team,setTeam] = useState('');
  const [collaboratorId,setCollaboratorId] = useState('');
  const [people,setPeople] = useState<{id:string;firstName:string;lastName:string;startDate:string;archived:boolean}[]>([]);
  const [monthly,setMonthly] = useState<Total[]>([]);
  const [yearly,setYearly] = useState<Total[]>([]);
  const [error,setError] = useRhNotice('error'); const [message,setMessage] = useRhNotice('success'); const [busy,setBusy] = useState(false);
  const [loaded,setLoaded] = useState(false);
  useEffect(()=>{const controller=new AbortController();fetchRedaction('/api/redaction/rh/collaborateurs',{cache:'no-store',signal:controller.signal}).then(async r=>{if(r.ok)setPeople((await r.json()).collaborators??[]);}).catch(()=>undefined);return ()=>controller.abort();},[]);
  const params = () => new URLSearchParams({start,end,...(team.trim()?{team:team.trim()}:{}),...(collaboratorId?{collaboratorId}:{})});
  async function load(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setError('');setMessage('');
    if(!isValidDate(start)||!isValidDate(end)||end<start||end>kinshasaToday()){setError('Vérifiez la période.');return;}
    setBusy(true);
    try {const response=await fetchRedaction(`/api/redaction/rh/paiements-anciens/bilan?${params()}`,{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error||'Bilan indisponible.');setMonthly(data.monthly);setYearly(data.yearly);setLoaded(true);}
    catch(err){setError(err instanceof Error?err.message:'Bilan indisponible.');}finally{setBusy(false);}
  }
  async function download(mode:'summary'|'detail'|'events') {
    setError('');setMessage('');setBusy(true);
    try {const query=params();query.set('mode',mode);const response=await fetchRedaction(`/api/redaction/rh/paiements-anciens/bilan?${query}`,{method:'POST',cache:'no-store'});if(!response.ok){const data=await response.json();throw new Error(data.error||'Export impossible.');}const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`rh-paiements-${mode}-${start}-${end}.csv`;document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),30_000);setMessage('Export CSV téléchargé. Conservez-le dans un espace sécurisé.');}
    catch(err){setError(err instanceof Error?err.message:'Export impossible.');}finally{setBusy(false);}
  }
  function totals(rows:Total[],label:string){return <div className="space-y-2"><h3 className="text-sm font-bold">{label}</h3>{rows.map(row=><div key={`${row.period}-${row.currency}`} className="rounded-xl border border-border p-3 text-sm"><p className="font-semibold">{row.period} · {row.currency}</p><p className="mt-1 text-xs">Paiements déjà enregistrés : {formatMinorUnits(BigInt(row.recordedMinor),row.currency)} · Historique vérifié supplémentaire : {formatMinorUnits(BigInt(row.verifiedHistoricalMinor),row.currency)}</p><p className="mt-1 font-semibold">Total vérifié : {formatMinorUnits(BigInt(row.totalVerifiedMinor),row.currency)}</p>{BigInt(row.pendingMinor)>BigInt(0)&&<p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Déclarations à vérifier, non incluses : {formatMinorUnits(BigInt(row.pendingMinor),row.currency)}</p>}{row.matchedCount>0&&<p className="mt-1 text-xs text-muted-foreground">{row.matchedCount} déclaration(s) rapprochée(s), sans double compte.</p>}</div>)}{rows.length===0&&<p className="text-xs text-muted-foreground">Aucune donnée pour cette période.</p>}</div>;}
  return <section className="space-y-4 rounded-2xl border border-border bg-card p-5"><h2 className="font-display text-lg font-bold">Bilan des paiements</h2><p className="text-sm text-muted-foreground">Reconstitution par mois et par an, devise par devise. Les déclarations non vérifiées restent séparées. Ce bilan ne prouve pas que les données disparues ont été retrouvées.</p>
    <form onSubmit={load} className="flex flex-wrap items-end gap-3"><label className="text-xs font-medium">Du<input required type="date" min="1900-01-01" value={start} onChange={(e)=>{setStart(e.target.value);setLoaded(false);}} className="mt-1 block rounded-lg border border-border bg-background p-2" /></label><label className="text-xs font-medium">Au<input required type="date" min={start||'1900-01-01'} max={today} value={end} onChange={(e)=>{setEnd(e.target.value);setLoaded(false);}} className="mt-1 block rounded-lg border border-border bg-background p-2" /></label><label className="text-xs font-medium">Équipe actuelle (facultatif)<input maxLength={150} value={team} onChange={(e)=>{setTeam(e.target.value);setLoaded(false);}} className="mt-1 block rounded-lg border border-border bg-background p-2" /></label><label className="text-xs font-medium">Collaborateur (facultatif)<select value={collaboratorId} onChange={(e)=>{const id=e.target.value;setCollaboratorId(id);setLoaded(false);if(id){const person=people.find(p=>p.id===id);if(person?.startDate)setStart(person.startDate);}}} className="mt-1 block max-w-64 rounded-lg border border-border bg-background p-2"><option value="">Toute l’entreprise</option>{people.map(p=><option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.archived?' (archivé)':''}</option>)}</select></label><button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">Calculer</button></form>
    {error&&<p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}{message&&<p role="status" className="text-sm text-primary">{message}</p>}
    {loaded&&<><div className="grid gap-4 lg:grid-cols-2">{totals(monthly,'Par mois')}{totals(yearly,'Par année')}</div><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={()=>void download('summary')} className="rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-50">Exporter le bilan CSV</button><button type="button" disabled={busy} onClick={()=>void download('detail')} className="rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-50">Exporter le détail CSV</button><button type="button" disabled={busy} onClick={()=>void download('events')} className="rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-50">Exporter les décisions CSV</button></div><p className="text-xs text-muted-foreground">Exports confidentiels journalisés. Chaque ligne du détail porte un identifiant pour retrouver la saisie ou le retrait source. Maximum 5 000 lignes : réduire la période si nécessaire.</p></>}
  </section>;
}
