'use client';
import { useRhNotice } from './use-rh-notice';
import { useEffect, useState } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import type { Collaborator } from '@/lib/redaction/rh/collaborator';
import type { YoutubePerformance } from '@/lib/redaction/rh/youtube-performance';
import { validateSubmissionDecision, type Submission, type SubmissionStatus } from '@/lib/redaction/rh/submissions';

const labels: Record<SubmissionStatus, string> = { pending: 'En attente', approved: 'Validée', rejected: 'Refusée', cancelled: 'Annulée' };
export function SubmissionReview({ youtubeEnabled = false }: { youtubeEnabled?: boolean }) {
  const [people, setPeople] = useState<Collaborator[]>([]); const [personId, setPersonId] = useState('');
  const [videos, setVideos] = useState<YoutubePerformance[]>([]);
  const [videosReady, setVideosReady] = useState(false);
  const [videoFormId, setVideoFormId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState(''), [videoRole, setVideoRole] = useState('');
  const [videoBusy, setVideoBusy] = useState(false), [videoError, setVideoError] = useState('');
  const [items, setItems] = useState<Submission[]>([]); const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useRhNotice('error'); const [message, setMessage] = useRhNotice('success');
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
  useEffect(() => {
    setVideoFormId(null); setVideoError('');
  }, [personId]);
  useEffect(() => {
    if (!youtubeEnabled) return;
    const controller = new AbortController();
    setVideosReady(false);
    fetchRedaction('/api/redaction/rh/performances', { cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); setVideos((await response.json()).performances); setVideosReady(true); })
      .catch(() => { if (!controller.signal.aborted) { setVideosReady(false); setVideoError('Liens vidéo indisponibles. Vérifiez le module YouTube.'); } });
    return () => controller.abort();
  }, [youtubeEnabled, reload]);
  async function attachVideo(item: Submission) {
    if (!personId || !videoUrl.trim() || !videoRole.trim()) return;
    setVideoBusy(true); setVideoError(''); setMessage('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/performances', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaboratorId: personId, submissionId: item.id, url: videoUrl, role: videoRole }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Lien vidéo invalide.');
      setVideoFormId(null); setVideoUrl(''); setVideoRole('');
      setMessage('Vidéo associée. Vérifiez-la, puis validez la prestation et la contribution séparément.');
      setReload(n => n + 1); window.dispatchEvent(new Event('rh-performances-changed'));
    } catch (cause) { setVideoError(cause instanceof Error ? cause.message : 'Association impossible.'); }
    finally { setVideoBusy(false); }
  }
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
    <div><h2 className="font-display text-lg font-bold">Déclarations des collaborateurs</h2></div>
    {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
    {videoError && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{videoError}</p>}
    {!youtubeEnabled && <p className="text-xs text-muted-foreground">Lien vidéo : module YouTube non activé.</p>}
    <label className="block text-sm font-medium">Collaborateur<select disabled={busy || videoBusy} value={personId} onChange={(e) => { setPersonId(e.target.value); setMessage(''); }} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"><option value="">Sélectionner…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.team}</option>)}</select></label>
    {personId && (loading ? <p className="text-sm">Chargement…</p> : failed ? null : <div className="space-y-2">
      {items.length === 0 && <p className="text-sm text-muted-foreground">Aucune déclaration.</p>}
      {items.map((item) => {
        const linked = videos.find(video => video.submissionId === item.id);
        return <article key={item.id} className="rounded-lg border border-border p-3 text-sm">
        <p className="font-semibold">{item.date} · {labels[item.status]}</p><p className="mt-1 text-muted-foreground">{item.description}</p>
        {item.decisionNote && <p className="mt-1">Motif : {item.decisionNote}</p>}
        {!youtubeEnabled && (item.status === 'pending' || item.status === 'approved') && <button type="button" disabled title="Activer d’abord le module YouTube RH" className="mt-3 rounded-lg border border-border px-3 py-2 font-semibold opacity-50">+ Ajouter le lien vidéo manquant · Non activé</button>}
        {youtubeEnabled && videosReady && (linked ? <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
          <p className="font-semibold">Vidéo associée · Contribution {linked.status === 'approved' ? 'validée' : linked.status === 'rejected' ? 'refusée' : 'à vérifier'}</p>
          <a href={linked.url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-primary underline">{linked.title} ↗</a>
          <p className="text-xs text-muted-foreground">Rôle : {linked.role}</p>
          {linked.status === 'pending' && <a href="#performances-youtube" className="mt-2 inline-block text-xs font-semibold text-primary underline">Vérifier la contribution</a>}
        </div> : (item.status === 'pending' || item.status === 'approved') && <div className="mt-3">
          <button type="button" disabled={busy || videoBusy} onClick={() => { setVideoFormId(videoFormId === item.id ? null : item.id); setVideoUrl(''); setVideoRole(''); setVideoError(''); }} aria-expanded={videoFormId === item.id} className="rounded-lg border border-primary px-3 py-2 font-semibold text-primary disabled:opacity-50">{videoFormId === item.id ? 'Fermer le formulaire vidéo' : '+ Ajouter le lien vidéo manquant'}</button>
          {videoFormId === item.id && <form onSubmit={event => { event.preventDefault(); void attachVideo(item); }} className="mt-3 grid gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-2">
            <label className="block">Lien YouTube officiel<input required type="url" maxLength={300} disabled={videoBusy} value={videoUrl} onChange={event => setVideoUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
            <label className="block">Rôle du collaborateur dans la vidéo<input required maxLength={80} disabled={videoBusy} value={videoRole} onChange={event => setVideoRole(event.target.value)} placeholder="Journaliste, monteur…" className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
            <button type="submit" disabled={videoBusy} className="rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-2">{videoBusy ? 'Vérification…' : 'Vérifier et associer la vidéo'}</button>
          </form>}
        </div>)}
        {item.status === 'pending' && <div className="mt-3 space-y-2">
          <label className="block">Motif (obligatoire en cas de refus)<input maxLength={500} value={notes[item.id] ?? ''} onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
          <div className="flex gap-4"><button type="button" disabled={busy || videoBusy || videoFormId === item.id} onClick={() => void decide(item, 'approve')} className="font-semibold text-primary underline">Valider</button><button type="button" disabled={busy || videoBusy} onClick={() => void decide(item, 'reject')} className="text-red-700 underline dark:text-red-300">Refuser</button></div>
        </div>}
      </article>})}
      {items.length === 500 && <p className="text-xs text-muted-foreground">Les 500 déclarations les plus récentes sont affichées.</p>}
    </div>)}
  </section>;
}
