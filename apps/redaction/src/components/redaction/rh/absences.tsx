'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { validateAbsence, validateDecision, type Absence, type AbsenceDecision, type AbsenceStatus } from '@/lib/redaction/rh/absences';
import type { Collaborator } from '@/lib/redaction/rh/collaborator';

const labels: Record<AbsenceStatus, string> = { pending: 'En attente', approved: 'Approuvée', rejected: 'Refusée', cancelled: 'Annulée' };

export function Absences() {
  const [people, setPeople] = useState<Collaborator[]>([]);
  const [personId, setPersonId] = useState('');
  const [items, setItems] = useState<Absence[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const refresh = () => setReload((n) => n + 1);
    window.addEventListener('rh-collaborators-changed', refresh);
    return () => window.removeEventListener('rh-collaborators-changed', refresh);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetchRedaction('/api/redaction/rh/collaborateurs', { cache: 'no-store', signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const data = await r.json();
        const active = data.collaborators.filter((p: Collaborator) => !p.archived);
        setPeople(active);
        setPersonId((current) => active.some((p: Collaborator) => p.id === current) ? current : '');
      }).catch(() => { if (!controller.signal.aborted) setError('Impossible de charger les collaborateurs.'); });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => {
    setItems([]); setNotes({}); setFailed(false);
    if (!personId) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError('');
    fetchRedaction(`/api/redaction/rh/absences?${new URLSearchParams({ collaboratorId: personId })}`, { cache: 'no-store', signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(); const data = await r.json(); setItems(data.absences); })
      .catch(() => { if (!controller.signal.aborted) { setFailed(true); setError('Impossible de charger les absences. Vérifiez la migration RH.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [personId, reload]);

  async function send(method: 'POST' | 'PATCH', body: unknown) {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/absences', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Opération impossible.');
      setStartDate(''); setEndDate(''); setCategory(''); setMessage('Demande enregistrée.');
      setReload((n) => n + 1);
      window.dispatchEvent(new Event('rh-absences-changed'));
    } catch (err) { setError(err instanceof Error ? err.message : 'Opération impossible.'); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = validateAbsence({ collaboratorId: personId, startDate, endDate, category });
    if (!input) { setError('Vérifiez le type et les dates (durée maximale : 366 jours).'); return; }
    void send('POST', input);
  }
  function decide(item: Absence, decision: AbsenceDecision) {
    const payload = validateDecision({ decision, note: notes[item.id] ?? '' });
    if (!payload) { setError('Le motif est obligatoire pour un refus ; limitez la note à 500 caractères.'); return; }
    if (decision === 'cancel' && !window.confirm('Annuler cette absence ?')) return;
    void send('PATCH', { ...payload, id: item.id, version: item.version });
  }
  return <section className="space-y-4 rounded-xl border border-border bg-card p-5">
    <div><h2 className="font-display text-lg font-bold">Congés et absences</h2>
      <p className="mt-1 text-sm text-muted-foreground">L’admin enregistre et traite les demandes. Aucun solde de congés n’est calculé.</p></div>
    {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
    <label className="block text-sm font-medium">Collaborateur
      <select disabled={busy} value={personId} onChange={(event) => { setPersonId(event.target.value); setMessage(''); }} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2">
        <option value="">Sélectionner…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.team}</option>)}
      </select>
    </label>
    {personId && (loading ? <p className="text-sm">Chargement…</p> : failed ? null : <>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Aucune demande enregistrée.</p>}
        {items.map((item) => <article key={item.id} className="rounded-lg border border-border p-3 text-sm">
          <p className="font-semibold">{item.category} · {labels[item.status]}</p>
          <p className="text-muted-foreground">Du {item.startDate} au {item.endDate}</p>
          {item.decisionNote && <p className="mt-1">Motif de la dernière décision : {item.decisionNote}</p>}
          {(item.status === 'pending' || item.status === 'approved') && <div className="mt-3 space-y-2">
            <label className="block text-sm">Motif de décision {item.status === 'pending' && '(obligatoire en cas de refus)'}
              <input value={notes[item.id] ?? ''} maxLength={500} onChange={(event) => setNotes({ ...notes, [item.id]: event.target.value })} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" />
            </label>
            <div className="flex flex-wrap gap-3">
              {item.status === 'pending' && <><button type="button" disabled={busy} onClick={() => decide(item, 'approve')} className="font-semibold text-primary hover:underline">Approuver</button>
                <button type="button" disabled={busy} onClick={() => decide(item, 'reject')} className="text-red-700 hover:underline dark:text-red-300">Refuser</button></>}
              <button type="button" disabled={busy} onClick={() => decide(item, 'cancel')} className="hover:underline">Annuler la demande</button>
            </div>
          </div>}
        </article>)}
        {items.length === 500 && <p className="text-xs text-muted-foreground">Les 500 demandes les plus récentes sont affichées.</p>}
      </div>
      <form onSubmit={submit} className="space-y-3 border-t border-border pt-4">
        <h3 className="font-semibold">Enregistrer une demande</h3>
        <p className="text-xs text-muted-foreground">Ne renseignez pas de données médicales ou sensibles dans le type ou les motifs.</p>
        <label className="block text-sm font-medium">Type (ex. congé annuel)
          <input required maxLength={100} value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Du <input type="date" required min="1900-01-01" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
          <label className="text-sm font-medium">Au <input type="date" required min={startDate || '1900-01-01'} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
        </div>
        <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Enregistrement…' : 'Enregistrer en attente'}</button>
      </form>
    </>)}
  </section>;
}
