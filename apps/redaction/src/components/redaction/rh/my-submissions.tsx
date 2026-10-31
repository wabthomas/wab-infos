'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { validateSubmission, type Submission, type SubmissionStatus } from '@/lib/redaction/rh/submissions';

const labels: Record<SubmissionStatus, string> = { pending: 'En attente', approved: 'Validée', rejected: 'Refusée', cancelled: 'Annulée' };
const statusStyles: Record<SubmissionStatus, string> = { pending: 'bg-amber-500/10 text-amber-800 dark:text-amber-300', approved: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300', rejected: 'bg-rose-500/10 text-rose-800 dark:text-rose-300', cancelled: 'bg-muted text-muted-foreground' };
const endpoint = '/api/redaction/rh/mon-espace/prestations';
export function MySubmissions({ today }: { today: string }) {
  const [items, setItems] = useState<Submission[]>([]);
  const [date, setDate] = useState(''); const [description, setDescription] = useState('');
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true); const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false); const [reload, setReload] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setFailed(false); setError('');
    fetchRedaction(endpoint, { cache: 'no-store', signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(); const data = await r.json(); setItems(data.submissions); })
      .catch(() => { if (!controller.signal.aborted) { setFailed(true); setError('Impossible de charger vos déclarations de prestation.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  async function send(method: 'POST' | 'PATCH', body: unknown) {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetchRedaction(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Opération impossible.');
      setDate(''); setDescription(''); setMessage(method === 'POST' ? 'Déclaration transmise à l’administrateur.' : 'Déclaration annulée.'); setFormOpen(false); setReload((n) => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Opération impossible.'); }
    finally { setBusy(false); }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = validateSubmission({ date, description }, today);
    if (!input) { setError('Vérifiez la date et la description.'); return; }
    void send('POST', input);
  }
  return <section className="space-y-4 rounded-xl border border-border bg-card p-5">
    <div><h2 className="font-semibold">Mes prestations</h2><p className="mt-1 text-sm text-muted-foreground">Déclarez votre travail pour vérification par l’admin. Une déclaration en attente n’est pas encore un relevé validé.</p></div>
    {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
    {loading ? <p className="text-sm">Chargement…</p> : failed ? null : <>
      {items.length === 0 && <p className="text-sm text-muted-foreground">Aucune déclaration.</p>}
      {items.map((item) => <article key={item.id} className="rounded-xl border border-border bg-background p-3.5 text-sm shadow-sm sm:p-4">
        <div className="flex items-start justify-between gap-2"><time dateTime={item.date} className="font-semibold tabular-nums">{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${item.date}T12:00:00Z`))}</time><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyles[item.status]}`}>{labels[item.status]}</span></div>
        <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{item.description || 'Aucune description.'}</p>
        {item.decisionNote && <p className="mt-1">Motif : {item.decisionNote}</p>}
        {item.status === 'pending' && <button type="button" disabled={busy} onClick={() => { if (window.confirm('Annuler cette déclaration en attente ?')) void send('PATCH', { action: 'cancel', id: item.id, version: item.version }); }} className="mt-2 text-primary underline">Annuler ma déclaration</button>}
      </article>)}
      {items.length === 500 && <p className="text-xs text-muted-foreground">Les 500 déclarations les plus récentes sont affichées.</p>}
      <button type="button" aria-expanded={formOpen} onClick={() => setFormOpen((open) => !open)} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">{formOpen ? 'Fermer' : '+ Déclarer une prestation'}</button>
      {formOpen && <div className="fixed inset-0 z-[80] flex items-end bg-black/50 sm:static sm:block sm:bg-transparent" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
      <form onSubmit={submit} className="max-h-[88dvh] w-full space-y-3 overflow-y-auto rounded-t-2xl border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-none sm:rounded-xl sm:border-t sm:shadow-none">
        <div className="flex items-center justify-between"><h3 className="font-semibold">Déclarer une prestation</h3><button type="button" onClick={() => setFormOpen(false)} className="rounded-full px-3 py-1 text-sm font-semibold text-muted-foreground">Fermer</button></div>
        <p className="text-xs text-muted-foreground">Décrivez les missions du jour, même si aucun contenu n’a été publié. Ne saisissez pas de données sensibles.</p>
        <label className="block text-sm font-medium">Date<input type="date" required min="1900-01-01" max={today} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
        <label className="block text-sm font-medium">Activités réalisées<input required maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
        <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Envoi…' : 'Envoyer la déclaration'}</button>
      </form></div>}
    </>}
  </section>;
}
