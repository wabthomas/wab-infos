'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowDownUp, Bell, CalendarDays, ClipboardList, FileLock2, LockKeyhole, WalletCards } from 'lucide-react';
import { MyDisputes } from './disputes';
import { MyAdjustments } from './adjustments';
import { MyDocuments } from './documents';
import { MyNotifications } from './my-notifications';
import { MyWithdrawals } from './my-withdrawals';
import { MyRemunerations } from './my-remunerations';
import { MySubmissions } from './my-submissions';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { validateAbsence, type Absence, type AbsenceStatus } from '@/lib/redaction/rh/absences';

const labels: Record<AbsenceStatus, string> = { pending: 'En attente', approved: 'Approuvée', rejected: 'Refusée', cancelled: 'Annulée' };
export function MyRh({ today, financeEnabled, withdrawalsEnabled, notificationsEnabled, documentsEnabled, disputesEnabled }: { disputesEnabled: boolean; today: string; financeEnabled: boolean; withdrawalsEnabled: boolean; notificationsEnabled: boolean; documentsEnabled: boolean }) {
  const [person, setPerson] = useState<{ id: string; firstName: string; lastName: string } | null>(null);
  const [items, setItems] = useState<Absence[]>([]);
  const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [reload, setReload] = useState(0);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    fetchRedaction('/api/redaction/rh/mon-espace', { cache: 'no-store', signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(); const data = await r.json(); setPerson(data.person); setItems(data.absences); })
      .catch(() => { if (!controller.signal.aborted) { setPerson(null); setItems([]); setError('Espace RH indisponible ou accès retiré. Contactez l’administrateur.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('');
    if (!person || !validateAbsence({ collaboratorId: person.id, startDate: start, endDate: end, category })) { setError('Vérifiez le type et les dates (durée maximale : 366 jours).'); return; }
    setBusy(true);
    try {
      const r = await fetchRedaction('/api/redaction/rh/mon-espace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate: start, endDate: end, category }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Envoi impossible.');
      setStart(''); setEnd(''); setCategory(''); setMessage('Demande envoyée à l’administrateur.'); setReload((n) => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Envoi impossible.'); }
    finally { setBusy(false); }
  }
  async function cancel(item: Absence) {
    if (!window.confirm('Annuler cette demande en attente ?')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/mon-espace', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel', id: item.id, version: item.version }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Annulation impossible.');
      setMessage('Demande annulée.'); setReload((n) => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Annulation impossible.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6 pb-8">
    <header className="relative overflow-hidden rounded-[1.5rem] bg-[#191923] px-6 py-7 text-white shadow-sm sm:px-8 sm:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-28 h-72 w-72 rounded-full border border-white/[0.06] bg-white/[0.025]" />
      <div className="relative flex flex-wrap items-end justify-between gap-4"><div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-300">Wab-infos · Mon compte</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Mon espace RH<span className="text-rose-400">.</span></h1>
        <p className="mt-2 text-sm leading-6 text-zinc-300">{person ? `Bienvenue ${person.firstName}, retrouvez vos informations et vos demandes.` : 'Retrouvez vos informations et vos demandes en un seul endroit.'}</p>
      </div><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-2 text-xs font-medium text-zinc-200"><LockKeyhole className="h-3.5 w-3.5 text-rose-300" /> Espace personnel</span></div>
    </header>
    {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
    {loading ? <p>Chargement…</p> : person && <>
      <nav aria-label="Sections de mon espace RH" className="flex gap-2 overflow-x-auto pb-1">
        {notificationsEnabled && <a href="#mes-notifications" className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary"><Bell className="h-4 w-4 text-primary" /> Notifications</a>}
        {documentsEnabled && <a href="#mes-documents" className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary"><FileLock2 className="h-4 w-4 text-primary" /> Documents</a>}
        {disputesEnabled && <a href="#mes-contestations" className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs font-semibold"><ClipboardList className="h-4 w-4 text-primary" /> Contestations</a>}
        <a href="#mes-prestations" className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary"><ClipboardList className="h-4 w-4 text-primary" /> Prestations</a>
        <a href="#mes-conges" className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary"><CalendarDays className="h-4 w-4 text-primary" /> Congés & absences</a>
        {financeEnabled && <a href="#mes-remunerations" className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary"><WalletCards className="h-4 w-4 text-primary" /> Rémunérations</a>}
        {withdrawalsEnabled && <a href="#mes-retraits" className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary"><ArrowDownUp className="h-4 w-4 text-primary" /> Retraits</a>}
      </nav>
      {notificationsEnabled && <div id="mes-notifications" className="scroll-mt-4"><MyNotifications /></div>}
      {documentsEnabled && <div id="mes-documents" className="scroll-mt-4"><MyDocuments /></div>}
      <div id="mes-prestations" className="scroll-mt-4"><MySubmissions today={today} /></div>
      {financeEnabled && <div id="mes-remunerations" className="scroll-mt-4"><MyRemunerations /></div>}
      {withdrawalsEnabled && <div id="mes-retraits" className="scroll-mt-4 space-y-4"><MyWithdrawals /><MyAdjustments /></div>}
      {disputesEnabled && <div id="mes-contestations" className="scroll-mt-4"><MyDisputes /></div>}
      <div id="mes-conges" className="scroll-mt-4 space-y-4"><section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Mes demandes</h2>
        {items.length === 0 && <p className="text-sm text-muted-foreground">Aucune demande enregistrée.</p>}
        {items.map((item) => <article key={item.id} className="rounded-lg border border-border p-3 text-sm">
          <p className="font-semibold">{item.category} · {labels[item.status]}</p><p>Du {item.startDate} au {item.endDate}</p>
          {item.decisionNote && <p className="mt-1 text-muted-foreground">Motif de la dernière décision : {item.decisionNote}</p>}
          {item.status === 'pending' && <button type="button" disabled={busy} onClick={() => void cancel(item)} className="mt-2 text-primary underline">Annuler ma demande</button>}
        </article>)}
        {items.length === 500 && <p className="text-xs text-muted-foreground">Les 500 demandes les plus récentes sont affichées.</p>}
      </section>
      <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Nouvelle demande</h2>
        <p className="text-xs text-muted-foreground">Ne saisissez pas de données médicales ou sensibles. Aucun solde de congés n’est calculé.</p>
        <label className="block text-sm font-medium">Type (ex. congé annuel)<input value={category} onChange={(e) => setCategory(e.target.value)} required maxLength={100} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Du<input type="date" min="1900-01-01" required value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
          <label className="text-sm font-medium">Au<input type="date" min={start || '1900-01-01'} required value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
        </div>
        <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Envoi…' : 'Envoyer la demande'}</button>
      </form></div>
    </>}
  </div>;
}
