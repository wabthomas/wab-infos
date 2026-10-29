'use client';
import { useEffect, useState } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import type { Collaborator } from '@/lib/redaction/rh/collaborator';
import { validateSubmissionDecision, type Submission, type SubmissionStatus } from '@/lib/redaction/rh/submissions';

const labels: Record<SubmissionStatus, string> = { pending: 'En attente', approved: 'Validée', rejected: 'Refusée', cancelled: 'Annulée' };
export function SubmissionReview() {
  const [people, setPeople] = useState<Collaborator[]>([]); const [personId, setPersonId] = useState('');
  const [items, setItems] = useState<Submission[]>([]); const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false); const [failed, setFailed] = useState(false); const [busy, setBusy] = useState(false); const [reload, setReload] = useState(0);
  useEffect(() => {
    const refresh = () => setReload((n) => n + 1);
    window.addEventListener('rh-collaborators-changed', refresh);
    return () => window.removeEventListener('rh-collaborators-changed', refresh);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetchRedaction('/api/redaction/rh/collaborateurs', { cache: 'no-store', signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(); const data = await r.json(); const active = data.collaborators.filter((p: Collaborator) => !p.archived); setPeople(active); setPersonId((current) => active.some((p: Collaborator) => p.id === current) ? current : ''); })
      .catch(() => { if (!controller.signal.aborted) setError('Impossible de charger les collaborateurs.'); });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => {
    setItems([]); setNotes({}); setFailed(false);
    if (!personId) { setLoading(false); return; }
    const controller = new AbortController(); setLoading(true); setError('');
    fetchRedaction(`/api/redaction/rh/declarations?${new URLSearchParams({ collaboratorId: personId })}`, { cache: 'no-store', signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(); const data = await r.json(); setItems(data.submissions); })
      .catch(() => { if (!controller.signal.aborted) { setFailed(true); setError('Impossible de charger les déclarations. Vérifiez la migration RH.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [personId, reload]);
  async function decide(item: Submission, decision: 'approve' | 'reject') {
    const payload = validateSubmissionDecision({ decision, note: notes[item.id] ?? '' });
    if (!payload) { setError('Le motif est obligatoire pour un refus ; limitez la note à 500 caractères.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const r = await fetchRedaction('/api/redaction/rh/declarations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, version: item.version, ...payload }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Décision impossible.');
      setMessage('Décision enregistrée.'); setReload((n) => n + 1); window.dispatchEvent(new Event('rh-submissions-changed'));
    } catch (e) { setError(e instanceof Error ? e.message : 'Décision impossible.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-4 rounded-xl border border-border bg-card p-5">
    <div><h2 className="font-display text-lg font-bold">Déclarations des collaborateurs</h2><p className="mt-1 text-sm text-muted-foreground">Une validation crée le relevé de prestation sans écraser un relevé existant. Aucun salaire ou retenue n’est calculé.</p></div>
    {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
    <label className="block text-sm font-medium">Collaborateur<select disabled={busy} value={personId} onChange={(e) => { setPersonId(e.target.value); setMessage(''); }} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"><option value="">Sélectionner…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.team}</option>)}</select></label>
    {personId && (loading ? <p className="text-sm">Chargement…</p> : failed ? null : <div className="space-y-2">
      {items.length === 0 && <p className="text-sm text-muted-foreground">Aucune déclaration.</p>}
      {items.map((item) => <article key={item.id} className="rounded-lg border border-border p-3 text-sm">
        <p className="font-semibold">{item.date} · {labels[item.status]}</p><p className="mt-1 text-muted-foreground">{item.description}</p>
        {item.decisionNote && <p className="mt-1">Motif : {item.decisionNote}</p>}
        {item.status === 'pending' && <div className="mt-3 space-y-2">
          <label className="block">Motif (obligatoire en cas de refus)<input maxLength={500} value={notes[item.id] ?? ''} onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
          <div className="flex gap-4"><button type="button" disabled={busy} onClick={() => void decide(item, 'approve')} className="font-semibold text-primary underline">Valider</button><button type="button" disabled={busy} onClick={() => void decide(item, 'reject')} className="text-red-700 underline dark:text-red-300">Refuser</button></div>
        </div>}
      </article>)}
      {items.length === 500 && <p className="text-xs text-muted-foreground">Les 500 déclarations les plus récentes sont affichées.</p>}
    </div>)}
  </section>;
}
