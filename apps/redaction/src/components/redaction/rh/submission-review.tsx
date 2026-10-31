'use client';
import { useEffect, useState } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import type { Collaborator } from '@/lib/redaction/rh/collaborator';
import { validateSubmissionDecision, type Submission, type SubmissionStatus } from '@/lib/redaction/rh/submissions';

const labels: Record<SubmissionStatus, string> = { pending: 'En attente', approved: 'Validée', rejected: 'Refusée', cancelled: 'Annulée' };
export function SubmissionReview() {
  const [people, setPeople] = useState<Collaborator[]>([]); const [personId, setPersonId] = useState('');
  const [items, setItems] = useState<Submission[]>([]); const [notes, setNotes] = useState<Record<string, string>>({}); const [reviewing, setReviewing] = useState<Submission | null>(null);
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
      setMessage('Décision enregistrée.'); setReviewing(null); setReload((n) => n + 1); window.dispatchEvent(new Event('rh-submissions-changed'));
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
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{item.date}</p><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.status === 'approved' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : item.status === 'rejected' ? 'bg-red-500/10 text-red-700 dark:text-red-300' : item.status === 'pending' ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>{labels[item.status]}</span></div>
        <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{item.description}</p>
        {item.decisionNote && <p className="mt-2 text-sm">Motif : {item.decisionNote}</p>}
        {item.status === 'pending' && <>
          <div className="mt-3 hidden space-y-2 sm:block">
            <label className="block">Motif (obligatoire en cas de refus)<input maxLength={500} value={notes[item.id] ?? ''} onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })} className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2" /></label>
            <div className="flex gap-3"><button type="button" disabled={busy} onClick={() => void decide(item, 'approve')} className="min-h-11 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">Valider</button><button type="button" disabled={busy} onClick={() => void decide(item, 'reject')} className="min-h-11 rounded-xl border border-red-500/30 px-4 font-semibold text-red-700 dark:text-red-300 disabled:opacity-50">Refuser</button></div>
          </div>
          <button type="button" disabled={busy} onClick={() => setReviewing(item)} className="mt-3 min-h-11 w-full rounded-xl border border-primary/25 bg-primary/[0.06] px-4 font-semibold text-primary sm:hidden">Examiner la déclaration</button>
        </> }
      </article>)}
      {items.length === 500 && <p className="text-xs text-muted-foreground">Les 500 déclarations les plus récentes sont affichées.</p>}
    </div>)}
    {reviewing && <div className="fixed inset-0 z-[90] bg-black/55 sm:hidden" onClick={() => { if (!busy) setReviewing(null); }}>
      <section role="dialog" aria-modal="true" aria-label="Examiner la déclaration" onClick={(event) => event.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[90dvh] space-y-4 overflow-y-auto rounded-t-3xl border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">À examiner</p><h3 className="mt-1 font-display text-lg font-bold">Déclaration du {reviewing.date}</h3></div><button type="button" disabled={busy} aria-label="Fermer" onClick={() => setReviewing(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg">×</button></div>
        <p className="whitespace-pre-wrap rounded-xl bg-muted/60 p-3 text-sm leading-6">{reviewing.description}</p>
        <label className="block text-sm font-semibold">Motif (obligatoire en cas de refus)<input maxLength={500} value={notes[reviewing.id] ?? ''} onChange={(event) => setNotes({ ...notes, [reviewing.id]: event.target.value })} className="mt-1.5 block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal" /></label>
        <div className="grid grid-cols-2 gap-3"><button type="button" disabled={busy} onClick={() => void decide(reviewing, 'approve')} className="min-h-12 rounded-xl bg-primary px-3 font-semibold text-primary-foreground disabled:opacity-50">Valider</button><button type="button" disabled={busy} onClick={() => void decide(reviewing, 'reject')} className="min-h-12 rounded-xl border border-red-500/30 px-3 font-semibold text-red-700 dark:text-red-300 disabled:opacity-50">Refuser</button></div>
      </section>
    </div>}
  </section>;
}
