'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { validateSubmission, type Submission, type SubmissionStatus } from '@/lib/redaction/rh/submissions';

const labels: Record<SubmissionStatus, string> = { pending: 'En attente de vérification', approved: 'Validée', rejected: 'Refusée', cancelled: 'Annulée' };
const endpoint = '/api/redaction/rh/mon-espace/prestations';
export function MySubmissions({ today }: { today: string }) {
  const [items, setItems] = useState<Submission[]>([]);
  const [date, setDate] = useState(''); const [description, setDescription] = useState('');
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true); const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false); const [reload, setReload] = useState(0);
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
      setDate(''); setDescription(''); setMessage(method === 'POST' ? 'Déclaration transmise à l’administrateur.' : 'Déclaration annulée.'); setReload((n) => n + 1);
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
      {items.map((item) => <article key={item.id} className="rounded-lg border border-border p-3 text-sm">
        <p className="font-semibold">{item.date} · {labels[item.status]}</p>
        <p className="mt-1 text-muted-foreground">{item.description}</p>
        {item.decisionNote && <p className="mt-1">Motif : {item.decisionNote}</p>}
        {item.status === 'pending' && <button type="button" disabled={busy} onClick={() => { if (window.confirm('Annuler cette déclaration en attente ?')) void send('PATCH', { action: 'cancel', id: item.id, version: item.version }); }} className="mt-2 text-primary underline">Annuler ma déclaration</button>}
      </article>)}
      {items.length === 500 && <p className="text-xs text-muted-foreground">Les 500 déclarations les plus récentes sont affichées.</p>}
      <form onSubmit={submit} className="space-y-3 border-t border-border pt-4">
        <h3 className="font-semibold">Déclarer une prestation</h3>
        <p className="text-xs text-muted-foreground">Décrivez les missions du jour, même si aucun contenu n’a été publié. Ne saisissez pas de données sensibles.</p>
        <label className="block text-sm font-medium">Date<input type="date" required min="1900-01-01" max={today} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
        <label className="block text-sm font-medium">Activités réalisées<input required maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
        <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Envoi…' : 'Envoyer la déclaration'}</button>
      </form>
    </>}
  </section>;
}
