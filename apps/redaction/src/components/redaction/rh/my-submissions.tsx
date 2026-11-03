'use client';
import { useRhNotice } from './use-rh-notice';
import { CircleCheck, CircleHelp } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { PersonalHistoryControls } from './personal-history-controls';
import { historyUrl, type HistoryPeriod } from '@/lib/redaction/rh/personal-history';
import { enqueue, pending, notifyQueue } from '@/lib/redaction/rh/offline-queue';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { validateSubmission, type Submission, type SubmissionStatus } from '@/lib/redaction/rh/submissions';

const labels: Record<SubmissionStatus, string> = { pending: 'En attente', approved: 'Validée', rejected: 'Refusée', cancelled: 'Annulée' };
const statusStyles: Record<SubmissionStatus, string> = { pending: 'bg-amber-500/10 text-amber-800 dark:text-amber-300', approved: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300', rejected: 'bg-rose-500/10 text-rose-800 dark:text-rose-300', cancelled: 'bg-muted text-muted-foreground' };
const endpoint = '/api/redaction/rh/mon-espace/prestations';
export function MySubmissions({ today, owner = '' }: { today: string; owner?: string }) {
  const [localToday, setLocalToday] = useState(today);
  useEffect(() => { setLocalToday(new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kinshasa', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())); }, []);
  const [items, setItems] = useState<Submission[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<{ period: Exclude<HistoryPeriod, 'recent'>; value: string }>({ period: 'all', value: '' });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [date, setDate] = useState(''); const [description, setDescription] = useState('');
  const [error, setError] = useRhNotice('error'); const [message, setMessage] = useRhNotice('success');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); const [reload, setReload] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [queued, setQueued] = useState<Awaited<ReturnType<typeof pending>>>([]);
  useEffect(() => {
    const refresh = () => { void pending(owner).then(setQueued).catch(() => setError('Stockage local indisponible.')); };
    refresh(); window.addEventListener('rh-offline-queue', refresh);
    return () => window.removeEventListener('rh-offline-queue', refresh);
  }, [owner]);
  useEffect(() => {
    if (expanded && ((filter.period === 'month' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(filter.value)) || (filter.period === 'year' && !/^(19|20)\d{2}$/.test(filter.value)))) { setItems([]); setHasMore(false); setLoading(false); return; }
    const controller = new AbortController(); setLoading(true); setError('');
    fetchRedaction(historyUrl(endpoint, expanded ? filter.period : 'recent', filter.value, page), { cache: 'no-store', signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(); const data = await r.json();
        setItems((previous) => page === 1 ? data.submissions : [...previous, ...data.submissions.filter((item: Submission) => !previous.some((old) => old.id === item.id))]);
        setHasMore(data.hasMore);
      })
      .catch(() => { if (!controller.signal.aborted) setError('Impossible de charger vos déclarations de prestation. Réessayez.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload, expanded, filter, page]);
  async function send(method: 'POST' | 'PATCH', body: unknown) {
    setBusy(true); setError(''); setMessage('');
    const offlinePayload = method === 'POST' ? { ...(body as object), clientId: crypto.randomUUID(), recordedAt: new Date().toISOString() } : null;
    try {
      const response = await fetchRedaction(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(offlinePayload ?? body) });
      const data = await response.json();
      if (!response.ok) { if (method === 'POST' && [502, 503, 504].includes(response.status)) throw new TypeError('Server unavailable'); throw new Error(data.error || 'Opération impossible.'); }
      setDate(''); setDescription(''); setMessage(method === 'POST' ? 'Déclaration transmise à l’administrateur.' : 'Déclaration annulée.'); setFormOpen(false); setPage(1); setReload((n) => n + 1);
    } catch (e) { if (method === 'POST' && e instanceof TypeError) await saveOffline(offlinePayload as { date: string; description: string; clientId: string; recordedAt: string }); else setError(e instanceof Error ? e.message : 'Opération impossible.'); }
    finally { setBusy(false); }
  }
  async function saveOffline(input: { date: string; description: string; clientId?: string; recordedAt?: string }) {
    try {
      if (!owner) throw new Error('Identité indisponible');
      await enqueue({ id: input.clientId ?? crypto.randomUUID(), owner, kind: 'prestation', recordedAt: input.recordedAt ?? new Date().toISOString(), date: input.date, description: input.description });
      notifyQueue(); setDate(''); setDescription(''); setFormOpen(false);
      setMessage('Déclaration enregistrée sur cet appareil, en attente de synchronisation.');
    } catch { setError('Stockage hors ligne indisponible : déclaration non enregistrée.'); }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = validateSubmission({ date, description }, localToday);
    if (!input) { setError('Vérifiez la date et la description.'); return; }
    if (!navigator.onLine) {
      void saveOffline(input);
    } else void send('POST', input);
  }
  return <section className="space-y-4 rounded-xl border border-border bg-card p-5">
    <div><h2 className="font-semibold">Mes prestations</h2><p className="mt-1 text-sm text-muted-foreground">Déclarez votre travail pour vérification par l’admin. Une déclaration en attente n’est pas encore un relevé validé.</p></div>
    {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
    {queued.filter((op) => op.kind === 'prestation').map((op) => <p key={op.id} role="status" className="rounded-lg bg-amber-500/10 p-3 text-sm">{op.date} · {op.description} — en attente d’envoi</p>)}
    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{expanded ? 'Toutes mes prestations' : 'Prestations de la semaine'}</h3>
      <button type="button" aria-expanded={expanded} onClick={() => { setExpanded((open) => !open); setPage(1); setItems([]); }} className="text-sm font-semibold text-primary underline">{expanded ? 'Réduire' : 'Voir plus'}</button></div>
    {expanded && <PersonalHistoryControls filter={filter} onChange={(next) => { setFilter(next); setPage(1); setItems([]); }} />}
    {loading && <p role="status" className="text-sm">Chargement…</p>}
    {(!loading || page > 1) && <>
      {items.length === 0 && !error && <p className="text-sm text-muted-foreground">Aucune prestation pour cette période.</p>}
      {items.map((item) => <article key={item.id} className="rounded-xl border border-border bg-background p-3.5 text-sm shadow-sm sm:p-4">
        <div className="flex items-start justify-between gap-2"><time dateTime={item.date} className="inline-flex items-center gap-1.5 font-semibold tabular-nums">{item.status === 'approved' ? <CircleCheck aria-label="Prestation validée" className="h-4 w-4 text-emerald-600" /> : <CircleHelp aria-label="Prestation non validée" className={`h-4 w-4 ${item.status === 'rejected' ? 'text-rose-600' : 'text-amber-600'}`} />}{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${item.date}T12:00:00Z`))}</time><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyles[item.status]}`}>{labels[item.status]}</span></div>
        <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{item.description || 'Aucune description.'}</p>
        {item.decisionNote && <p className="mt-1">Motif : {item.decisionNote}</p>}
        {item.status === 'pending' && <button type="button" disabled={busy} onClick={() => { if (window.confirm('Annuler cette déclaration en attente ?')) void send('PATCH', { action: 'cancel', id: item.id, version: item.version }); }} className="mt-2 text-primary underline">Annuler ma déclaration</button>}
      </article>)}
      {expanded && hasMore && <button type="button" disabled={loading} onClick={() => setPage((n) => n + 1)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">Charger plus de prestations</button>}
    </>}
      <button type="button" aria-expanded={formOpen} onClick={() => setFormOpen((open) => !open)} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">{formOpen ? 'Fermer' : '+ Déclarer une prestation'}</button>
      {formOpen && <div className="fixed inset-0 z-[80] flex items-end bg-black/50 sm:static sm:block sm:bg-transparent" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
      <form onSubmit={submit} className="max-h-[88dvh] w-full space-y-3 overflow-y-auto rounded-t-2xl border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-none sm:rounded-xl sm:border-t sm:shadow-none">
        <div className="flex items-center justify-between"><h3 className="font-semibold">Déclarer une prestation</h3><button type="button" onClick={() => setFormOpen(false)} className="rounded-full px-3 py-1 text-sm font-semibold text-muted-foreground">Fermer</button></div>
        <p className="text-xs text-muted-foreground">Décrivez les missions du jour, même si aucun contenu n’a été publié. Ne saisissez pas de données sensibles.</p>
        <label className="block text-sm font-medium">Date<input type="date" required min="1900-01-01" max={localToday} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
        <label className="block text-sm font-medium">Activités réalisées<input required maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
        <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Envoi…' : 'Envoyer la déclaration'}</button>
      </form></div>}
  </section>;
}
