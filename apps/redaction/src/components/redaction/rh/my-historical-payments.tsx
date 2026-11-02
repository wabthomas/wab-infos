'use client';
import { useRhNotice } from './use-rh-notice';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { formatMinorUnits } from '@/lib/redaction/rh/money';
import { validateHistoricalPayment, type HistoricalPayment, type HistoricalPaymentStatus } from '@/lib/redaction/rh/historical-payments';
import { kinshasaToday } from '@/lib/redaction/rh/activities';

const endpoint = '/api/redaction/rh/mon-espace/paiements-anciens';
const labels: Record<HistoricalPaymentStatus,string> = { pending:'À vérifier',verified:'Vérifié',rejected:'Refusé',cancelled:'Annulé' };

export function MyHistoricalPayments() {
  const [rows,setRows] = useState<HistoricalPayment[]>([]);
  const [page,setPage] = useState(1); const [hasMore,setHasMore] = useState(false);
  const [reload,setReload] = useState(0); const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false); const [error,setError] = useRhNotice('error'); const [message,setMessage] = useRhNotice('success');
  const [date,setDate] = useState(''); const [amount,setAmount] = useState('');
  const [currency,setCurrency] = useState<'USD'|'CDF'>('USD');
  const [kind,setKind] = useState('remuneration'); const [method,setMethod] = useState('mobile_money');
  const [reference,setReference] = useState(''); const [note,setNote] = useState('');
  const key = useRef<string | null>(null);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    fetchRedaction(`${endpoint}?page=${page}`,{ cache:'no-store', signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); const data = await response.json() as { payments: HistoricalPayment[]; hasMore:boolean };
        setRows((old) => page === 1 ? data.payments : [...old,...data.payments.filter((item) => !old.some((r) => r.id === item.id))]); setHasMore(data.hasMore); })
      .catch(() => { if (!controller.signal.aborted) setError('Impossible de charger vos déclarations.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  },[page,reload]);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('');
    key.current ??= crypto.randomUUID();
    const data = { key:key.current,date,amount,currency,kind,method,reference,note };
    if (!validateHistoricalPayment(data,kinshasaToday(),null)) { setError('Vérifiez la date, le montant et les champs.'); return; }
    setBusy(true);
    try {
      const response = await fetchRedaction(endpoint,{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Envoi impossible.');
      key.current=null; setDate('');setAmount('');setReference('');setNote('');
      setMessage('Paiement déclaré. Il reste à vérifier par la gestion RH et ne modifie pas votre solde.');
      setRows([]);setPage(1);setReload((n)=>n+1);
    } catch (err) { setError(err instanceof Error ? err.message : 'Envoi impossible.'); }
    finally { setBusy(false); }
  }
  async function cancel(row:HistoricalPayment) {
    if (!window.confirm('Annuler cette déclaration en attente ?')) return;
    setBusy(true);setError('');
    try {
      const response = await fetchRedaction(endpoint,{ method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({ action:'cancel',id:row.id,version:row.version }) });
      if (!response.ok) { const data=await response.json(); throw new Error(data.error || 'Annulation impossible.'); }
      setRows([]);setPage(1);setReload((n)=>n+1);
    } catch (err) { setError(err instanceof Error ? err.message : 'Annulation impossible.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-bold">Déclarer un ancien paiement reçu</h2>
      <p className="mt-2 text-sm text-muted-foreground">Reconstituez vos paiements depuis votre date d’arrivée. Saisissez uniquement des montants que vous avez effectivement reçus. Une déclaration n’est ni un paiement confirmé, ni une rémunération due, ni une modification de votre solde.</p>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Date du paiement<input type="date" required min="1900-01-01" max={kinshasaToday()} value={date} onChange={(e)=>{setDate(e.target.value);key.current=null;}} className="mt-1 w-full rounded-lg border border-border bg-background p-2" /></label>
        <label className="text-sm font-medium">Montant reçu<input required inputMode="decimal" maxLength={18} value={amount} onChange={(e)=>{setAmount(e.target.value);key.current=null;}} placeholder="Ex. 150,00" className="mt-1 w-full rounded-lg border border-border bg-background p-2" /></label>
        <label className="text-sm font-medium">Devise<select value={currency} onChange={(e)=>{setCurrency(e.target.value as 'USD'|'CDF');key.current=null;}} className="mt-1 w-full rounded-lg border border-border bg-background p-2"><option value="USD">USD</option><option value="CDF">CDF</option></select></label>
        <label className="text-sm font-medium">Nature<select value={kind} onChange={(e)=>{setKind(e.target.value);key.current=null;}} className="mt-1 w-full rounded-lg border border-border bg-background p-2"><option value="remuneration">Rémunération</option><option value="prestation">Prestation</option><option value="prime">Prime</option><option value="autre">Autre</option></select></label>
        <label className="text-sm font-medium">Moyen de réception<select value={method} onChange={(e)=>{setMethod(e.target.value);key.current=null;}} className="mt-1 w-full rounded-lg border border-border bg-background p-2"><option value="mobile_money">Mobile Money</option><option value="virement">Virement</option><option value="especes">Espèces</option><option value="autre">Autre</option></select></label>
        <label className="text-sm font-medium">Référence (facultatif)<input maxLength={150} value={reference} onChange={(e)=>{setReference(e.target.value);key.current=null;}} className="mt-1 w-full rounded-lg border border-border bg-background p-2" /></label>
        <label className="text-sm font-medium sm:col-span-2">Précisions / source (facultatif)<textarea maxLength={500} value={note} onChange={(e)=>{setNote(e.target.value);key.current=null;}} className="mt-1 w-full rounded-lg border border-border bg-background p-2" /></label>
        <p className="text-xs text-muted-foreground sm:col-span-2">Ne saisissez pas de numéro de compte complet ni de données sensibles. Pour corriger une déclaration déjà examinée, contactez la gestion RH.</p>
        <button type="submit" disabled={busy} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy?'Envoi…':'Déclarer le paiement'}</button>
      </form>
    </section>
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5"><h2 className="font-display text-lg font-bold">Mes paiements déclarés</h2>
      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!loading && !error && rows.length===0 && <p className="text-sm text-muted-foreground">Aucune déclaration.</p>}
      {rows.map((row)=><article key={row.id} className="rounded-xl border border-border p-3.5 text-sm"><div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{row.date} · {formatMinorUnits(BigInt(row.amountMinor),row.currency)}</span><span className="text-xs font-bold">{labels[row.status]}</span></div><p className="mt-1 text-xs text-muted-foreground">{row.kind} · {row.method}{row.reference?` · ${row.reference}`:''}</p>{row.reviewNote && <p className="mt-2 text-xs">Décision : {row.reviewNote}</p>}{row.matchedWithdrawalId && <p className="mt-1 text-xs text-muted-foreground">Rapproché d’un retrait déjà enregistré (non compté deux fois).</p>}{row.status==='pending' && <button type="button" disabled={busy} onClick={()=>void cancel(row)} className="mt-2 text-xs font-semibold text-primary underline">Annuler la déclaration</button>}</article>)}
      {hasMore && <button type="button" disabled={loading} onClick={()=>setPage((n)=>n+1)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">Voir plus</button>}
    </section>
  </div>;
}
