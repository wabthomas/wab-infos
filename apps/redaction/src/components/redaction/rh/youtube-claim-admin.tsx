'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import type { Collaborator } from '@/lib/redaction/rh/collaborator';
import type { Submission } from '@/lib/redaction/rh/submissions';

export function YoutubeClaimAdmin({ linkedSubmissionIds, onAdded }: { linkedSubmissionIds: string[]; onAdded: () => void }) {
  const [people, setPeople] = useState<Collaborator[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [collaboratorId, setCollaboratorId] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [url, setUrl] = useState('');
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetchRedaction('/api/redaction/rh/collaborateurs', { cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); setPeople((await response.json()).collaborators.filter((p: Collaborator) => !p.archived)); })
      .catch(() => { if (!controller.signal.aborted) setError('Liste des collaborateurs indisponible.'); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    setSubmissions([]); setSubmissionId('');
    if (!collaboratorId) return;
    const controller = new AbortController();
    fetchRedaction(`/api/redaction/rh/declarations?${new URLSearchParams({ collaboratorId })}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); setSubmissions((await response.json()).submissions); })
      .catch(() => { if (!controller.signal.aborted) setError('Prestations indisponibles.'); });
    return () => controller.abort();
  }, [collaboratorId]);
  const eligible = submissions.filter(item => (item.status === 'pending' || item.status === 'approved') && !linkedSubmissionIds.includes(item.id));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/performances', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ collaboratorId, submissionId, url, role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ajout impossible.');
      setUrl(''); setRole(''); setSubmissionId('');
      setMessage('Vidéo associée. La contribution reste à valider.'); onAdded();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ajout impossible.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
    <h3 className="font-semibold sm:col-span-2">Ajouter une vidéo à une prestation</h3>
    {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2 dark:text-red-300">{error}</p>}
    {message && <p role="status" className="text-sm text-primary sm:col-span-2">{message}</p>}
    <label className="text-sm">Collaborateur<select required disabled={busy} value={collaboratorId} onChange={e => { setCollaboratorId(e.target.value); setError(''); }} className="mt-1 w-full rounded-lg border border-border bg-background p-2"><option value="">Sélectionner…</option>{people.map(person => <option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option>)}</select></label>
    <label className="text-sm">Prestation<select required disabled={busy || !collaboratorId} value={submissionId} onChange={e => setSubmissionId(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2"><option value="">Sélectionner…</option>{eligible.map(item => <option key={item.id} value={item.id}>{item.date} · {item.description.slice(0, 65)} ({item.status === 'approved' ? 'validée' : 'en attente'})</option>)}</select></label>
    <label className="text-sm">Rôle dans la vidéo<input required maxLength={80} value={role} onChange={e => setRole(e.target.value)} placeholder="Journaliste, monteur…" className="mt-1 w-full rounded-lg border border-border bg-background p-2" /></label>
    <label className="text-sm">Lien YouTube officiel<input required type="url" maxLength={300} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="mt-1 w-full rounded-lg border border-border bg-background p-2" /></label>
    <button disabled={busy || !submissionId} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-2">{busy ? 'Vérification…' : 'Associer la vidéo'}</button>
  </form>;
}
