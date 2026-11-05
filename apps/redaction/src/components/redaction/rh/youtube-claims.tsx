'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import type { Submission } from '@/lib/redaction/rh/submissions';
import type { YoutubePerformance } from '@/lib/redaction/rh/youtube-performance';

const endpoint = '/api/redaction/rh/mon-espace/performances';
export function YoutubeClaims({ submissions }: { submissions: Submission[] }) {
  const [claims, setClaims] = useState<YoutubePerformance[]>([]);
  const [submissionId, setSubmissionId] = useState('');
  const [url, setUrl] = useState(''); const [role, setRole] = useState('');
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetchRedaction(endpoint, { cache: 'no-store', signal: controller.signal })
      .then(async r => { if (!r.ok) throw new Error(); setClaims((await r.json()).performances); })
      .catch(() => { if (!controller.signal.aborted) setError('Statistiques YouTube indisponibles. Vérifiez la configuration et la migration RH.'); });
    return () => controller.abort();
  }, [reload]);
  const eligible = submissions.filter(item => item.status === 'pending' && !claims.some(c => c.submissionId === item.id));
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    if (!navigator.onLine) { setError('Ajoutez la vidéo après la synchronisation de la prestation : la chaîne officielle doit être vérifiée en ligne.'); return; }
    setBusy(true);
    try {
      const r = await fetchRedaction(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId, url, role }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Vérification impossible.');
      setSubmissionId(''); setUrl(''); setRole(''); setMessage('Vidéo vérifiée sur la chaîne officielle. L’admin doit valider la prestation et votre contribution.'); setReload(v => v + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Envoi impossible.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 rounded-xl border border-border bg-card p-5">
    <div><h2 className="font-bold">Mes vidéos et contributions</h2></div>
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}{message && <p role="status" className="text-sm text-primary">{message}</p>}
    {claims.map(item => <div key={item.id} className="rounded-xl border border-border p-3 text-sm"><p className="font-semibold"><a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{item.title} ↗</a> · {item.role}</p><p className="text-muted-foreground">{item.submissionDate} · {item.submissionStatus === 'cancelled' || item.submissionStatus === 'rejected' ? 'Prestation non validée' : item.status === 'approved' && item.submissionStatus === 'approved' ? 'Contribution validée' : item.status === 'rejected' ? 'Contribution refusée' : 'À vérifier par l’admin'}</p>{item.note && <p>Motif : {item.note}</p>}</div>)}
    {eligible.length > 0 && <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
      <label className="text-sm">Prestation en attente<select required className="mt-1 w-full rounded-lg border border-border bg-background p-2" value={submissionId} onChange={e => setSubmissionId(e.target.value)}><option value="">Sélectionner…</option>{eligible.map(s => <option key={s.id} value={s.id}>{s.date} · {s.description.slice(0, 75)}</option>)}</select></label>
      <label className="text-sm">Votre rôle dans la vidéo<input required maxLength={80} placeholder="Journaliste, présentateur, monteur…" className="mt-1 w-full rounded-lg border border-border bg-background p-2" value={role} onChange={e => setRole(e.target.value)} /></label>
      <label className="text-sm sm:col-span-2">Lien de la vidéo sur la chaîne officielle<input required type="url" maxLength={300} placeholder="https://www.youtube.com/watch?v=…" className="mt-1 w-full rounded-lg border border-border bg-background p-2" value={url} onChange={e => setUrl(e.target.value)} /></label>
      <button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-2">{busy ? 'Vérification…' : 'Associer la vidéo à ma prestation'}</button>
    </form>}

  </section>;
}
