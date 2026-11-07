'use client';
import { useRhNotice } from './use-rh-notice';
import { YoutubeClaims } from './youtube-claims';
import { RhActionVoiceToggle, useRhActionVoice } from './rh-action-voice';
import { CircleCheck, CircleHelp } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { PersonalHistoryControls } from './personal-history-controls';
import { historyUrl, type HistoryPeriod } from '@/lib/redaction/rh/personal-history';
import { enqueue, pending, notifyQueue } from '@/lib/redaction/rh/offline-queue';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { contributionRole, youtubeVideoId } from '@/lib/redaction/rh/youtube-performance';
import { validateSubmission, type Submission, type SubmissionStatus } from '@/lib/redaction/rh/submissions';

const labels: Record<SubmissionStatus, string> = { pending: 'En attente', approved: 'Validée', rejected: 'Refusée', cancelled: 'Annulée' };
const statusStyles: Record<SubmissionStatus, string> = { pending: 'bg-amber-500/10 text-amber-800', approved: 'bg-emerald-500/10 text-emerald-800', rejected: 'bg-rose-500/10 text-rose-800', cancelled: 'bg-muted text-muted-foreground' };
const endpoint = '/api/redaction/rh/mon-espace/prestations';
export function MySubmissions({ today, owner = '', youtubeEnabled = false }: { today: string; owner?: string; youtubeEnabled?: boolean }) {
  const voice = useRhActionVoice();
  const [localToday, setLocalToday] = useState(today);
  useEffect(() => { setLocalToday(new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kinshasa', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())); }, []);
  const [items, setItems] = useState<Submission[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<{ period: Exclude<HistoryPeriod, 'recent'>; value: string }>({ period: 'all', value: '' });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [date, setDate] = useState(''); const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState(''); const [videoRole, setVideoRole] = useState('');
  const [linkedSubmissionId, setLinkedSubmissionId] = useState<string | null>(null);
  const videoRequestRef = useRef<{ clientId: string; recordedAt: string } | null>(null);
  const [error, setError] = useRhNotice('error'); const [message, setMessage] = useRhNotice('success');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); const [reload, setReload] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setMounted(true), []);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  useEffect(() => {
    if (!formOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) { event.preventDefault(); setFormOpen(false); }
      if (event.key !== 'Tab') return;
      const focusable = formRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)');
      if (!focusable?.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown); requestAnimationFrame(() => triggerRef.current?.focus()); };
  }, [formOpen]);
  const nativeInsetRef = useRef(0);
  const [visibleViewport, setVisibleViewport] = useState({ top: '0px', height: '100dvh' });
  useEffect(() => {
    if (!formOpen) return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const keepFocusedFieldVisible = () => {
      const form = formRef.current;
      const field = document.activeElement;
      if (!form || !(field instanceof HTMLElement) || !form.contains(field)) return;
      const bounds = form.getBoundingClientRect();
      const focus = field.getBoundingClientRect();
      if (focus.bottom > bounds.bottom - 72) form.scrollTop += focus.bottom - (bounds.bottom - 72);
      else if (focus.top < bounds.top + 12) form.scrollTop -= bounds.top + 12 - focus.top;
    };
    const resize = () => {
      const base = Math.min(viewport.height, window.innerHeight);
      const height = Math.max(120, base - nativeInsetRef.current);
      setVisibleViewport({ top: `${Math.max(0, viewport.offsetTop)}px`, height: `${height}px` });
      requestAnimationFrame(keepFocusedFieldVisible);
    };
    const onNativeInset = (event: Event) => {
      const detail = (event as CustomEvent<{ inset?: number }>).detail;
      nativeInsetRef.current = Math.max(0, Number(detail?.inset) || 0);
      resize();
    };
    resize();
    viewport.addEventListener('resize', resize);
    viewport.addEventListener('scroll', resize);
    window.addEventListener('resize', resize);
    window.addEventListener('wab-keyboard-inset', onNativeInset);
    return () => {
      viewport.removeEventListener('resize', resize);
      viewport.removeEventListener('scroll', resize);
      window.removeEventListener('resize', resize);
      window.removeEventListener('wab-keyboard-inset', onNativeInset);
    };
  }, [formOpen]);
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
    if(method === 'POST'){voice.prepare('submission');voice.prepare('submission-offline');}
    const offlinePayload = method === 'POST' ? { ...(body as object), clientId: crypto.randomUUID(), recordedAt: new Date().toISOString() } : null;
    try {
      const response = await fetchRedaction(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(offlinePayload ?? body) });
      const data = await response.json();
      if (!response.ok) { if (method === 'POST' && [502, 503, 504].includes(response.status)) throw new TypeError('Server unavailable'); throw new Error(data.error || 'Opération impossible.'); }
      if (method === 'POST') voice.speak('submission');
      if (method === 'POST') { setDate(''); setDescription(''); setVideoRole(''); setVideoUrl(''); setFormOpen(false); }
      setMessage(method === 'POST' ? 'Déclaration transmise à l’administrateur.' : 'Déclaration annulée.'); setPage(1); setReload((n) => n + 1);
    } catch (e) { if (method === 'POST' && e instanceof TypeError) await saveOffline(offlinePayload as { date: string; description: string; clientId: string; recordedAt: string }); else setError(e instanceof Error ? e.message : 'Opération impossible.'); }
    finally { setBusy(false); }
  }
  async function sendWithVideo(input: { date: string; description: string }) {
    setBusy(true); setError(''); setMessage('');
    try {
      let submissionId = linkedSubmissionId;
      if (!submissionId) {
        const requestId = videoRequestRef.current ?? { clientId: crypto.randomUUID(), recordedAt: new Date().toISOString() };
        videoRequestRef.current = requestId;
        voice.prepare('submission');
        const response = await fetchRedaction(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, ...requestId }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Prestation non enregistrée.');
        submissionId = data.submission.id;
        setLinkedSubmissionId(submissionId);
        voice.speak('submission');
        setPage(1); setReload(n => n + 1);
      }
      const response = await fetchRedaction('/api/redaction/rh/mon-espace/performances', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId, url: videoUrl, role: videoRole }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Lien non associé.');
      setDate(''); setDescription(''); setVideoUrl(''); setVideoRole(''); setLinkedSubmissionId(null); videoRequestRef.current = null;
      setFormOpen(false); setMessage('Prestation et vidéo enregistrées.'); setPage(1); setReload(n => n + 1);
    } catch (cause) {
      setError(`${linkedSubmissionId ? 'Prestation enregistrée. ' : ''}${cause instanceof Error ? cause.message : 'Envoi impossible.'}`);
    } finally { setBusy(false); }
  }
  async function saveOffline(input: { date: string; description: string; clientId?: string; recordedAt?: string }) {
    try {
      voice.prepare('submission-offline');
      if (!owner) throw new Error('Identité indisponible');
      await enqueue({ id: input.clientId ?? crypto.randomUUID(), owner, kind: 'prestation', recordedAt: input.recordedAt ?? new Date().toISOString(), date: input.date, description: input.description });
      notifyQueue(); setDate(''); setDescription(''); setVideoRole(''); setVideoUrl(''); setFormOpen(false);
      setMessage('Déclaration enregistrée sur cet appareil, en attente de synchronisation.');
      voice.speak('submission-offline');
    } catch { setError('Stockage hors ligne indisponible : déclaration non enregistrée.'); }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = validateSubmission({ date, description }, localToday);
    if (!input) { setError('Vérifiez la date et la description.'); return; }
    if (videoUrl.trim() || videoRole.trim() || linkedSubmissionId) {
      if (!youtubeEnabled) { setError('Lien YouTube non activé.'); return; }
      if (!youtubeVideoId(videoUrl) || !contributionRole(videoRole)) { setError('Vérifiez le lien YouTube et votre rôle.'); return; }
      if (!navigator.onLine) { setError('Connexion nécessaire pour vérifier le lien. Vous pouvez déclarer la prestation sans vidéo hors ligne.'); return; }
      void sendWithVideo(input);
    } else if (!navigator.onLine) {
      void saveOffline(input);
    } else void send('POST', input);
  }
  return <section className="space-y-4 rounded-xl border border-border bg-card p-5">
    <div><h2 className="font-semibold">Mes prestations</h2><div className="mt-3"><RhActionVoiceToggle voice={voice} /></div></div>
    {error && !formOpen && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
    {queued.filter((op) => op.kind === 'prestation').map((op) => <p key={op.id} role="status" className="rounded-lg bg-amber-500/10 p-3 text-sm">{op.date} · {op.description} — en attente d’envoi</p>)}
    <button ref={triggerRef} type="button" disabled={busy} aria-haspopup="dialog" aria-expanded={formOpen} onClick={() => { setError(''); setFormOpen(true); }} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">+ Nouvelle prestation</button>
    {formOpen && mounted && createPortal(<div style={{ '--rh-viewport-top': visibleViewport.top, '--rh-viewport-height': visibleViewport.height } as React.CSSProperties} className="fixed inset-x-0 top-[var(--rh-viewport-top)] z-[120] flex h-[var(--rh-viewport-height)] items-end justify-center bg-black/60 sm:items-center sm:p-4" onMouseDown={(event) => { if (!busy && event.target === event.currentTarget) setFormOpen(false); }}>
      <form ref={formRef} role="dialog" aria-modal="true" aria-labelledby="new-prestation-title" onFocusCapture={(event) => { const field = event.target; window.setTimeout(() => { if (document.activeElement !== field) return; const form = formRef.current; if (!form) return; const bounds = form.getBoundingClientRect(); const focus = field.getBoundingClientRect(); if (focus.bottom > bounds.bottom - 72) form.scrollTop += focus.bottom - (bounds.bottom - 72); }, 300); }} onSubmit={submit} className="max-h-full w-full space-y-3 overflow-y-auto overscroll-contain rounded-t-2xl border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-lg sm:rounded-2xl sm:pb-5">
        <div className="flex items-center justify-between"><h3 id="new-prestation-title" className="font-semibold">Nouvelle Prestation</h3><button ref={closeRef} type="button" disabled={busy} onClick={() => setFormOpen(false)} className="rounded-full px-3 py-1 text-sm font-semibold text-muted-foreground">Fermer</button></div>
        {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        <label className="block text-sm font-medium">Date<input type="date" required disabled={!!linkedSubmissionId} min="1900-01-01" max={localToday} value={date} onChange={(e) => { setDate(e.target.value); videoRequestRef.current = null; }} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
        <label className="block text-sm font-medium">Activités réalisées<textarea required disabled={!!linkedSubmissionId} rows={3} maxLength={500} value={description} onChange={(e) => { setDescription(e.target.value.replace(/[\r\n]+/g, ' ')); videoRequestRef.current = null; }} className="mt-1 block w-full resize-y rounded-lg border border-border bg-background px-3 py-2" /></label>
        <label className="block text-sm font-medium">Lien de la vidéo YouTube (facultatif){!youtubeEnabled && <span className="ml-2 text-xs text-muted-foreground">Non activé</span>}<input type="url" disabled={!youtubeEnabled || busy} maxLength={300} value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 disabled:opacity-60" /></label>
        {youtubeEnabled && <label className="block text-sm font-medium">Votre rôle dans la vidéo<input required={!!videoUrl.trim()} disabled={busy} maxLength={80} value={videoRole} onChange={e => setVideoRole(e.target.value)} placeholder="Journaliste, présentateur, monteur…" className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>}
        <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Envoi…' : linkedSubmissionId ? 'Réessayer le lien vidéo' : 'Envoyer la déclaration'}</button>
        {linkedSubmissionId && <button type="button" onClick={() => { setLinkedSubmissionId(null); videoRequestRef.current = null; setDate(''); setDescription(''); setVideoRole(''); setVideoUrl(''); setError(''); setMessage('Prestation enregistrée.'); setFormOpen(false); }} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">Terminer sans vidéo</button>}
      </form></div>, document.body)}
    {youtubeEnabled && <YoutubeClaims submissions={items} refreshKey={reload} />}
    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{expanded ? 'Toutes mes prestations' : 'Prestations de la semaine'}</h3>
      <button type="button" aria-expanded={expanded} onClick={() => { setExpanded((open) => !open); setPage(1); setItems([]); }} className="text-sm font-semibold text-primary underline">{expanded ? 'Réduire' : 'Voir plus'}</button></div>
    {expanded && <PersonalHistoryControls filter={filter} onChange={(next) => { setFilter(next); setPage(1); setItems([]); }} />}
    {loading && <p role="status" className="text-sm">Chargement…</p>}
    {(!loading || page > 1) && <>
      {items.length === 0 && !error && <p className="text-sm text-muted-foreground">Aucune prestation pour cette période.</p>}
      {items.map((item) => <article key={item.id} className="rounded-xl border border-border bg-background p-3.5 text-sm shadow-sm sm:p-4">
        <div className="flex items-start justify-between gap-2"><time dateTime={item.date} className="inline-flex items-center gap-1.5 font-semibold tabular-nums">{item.status === 'approved' ? <CircleCheck aria-label="Prestation validée" className="h-4 w-4 text-emerald-600" /> : <CircleHelp aria-label="Prestation non validée" className={`h-4 w-4 ${item.status === 'rejected' ? 'text-rose-600' : 'text-amber-600'}`} />}{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${item.date}T12:00:00Z`))}</time><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyles[item.status]}`}>{labels[item.status]}</span></div>
        <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{item.description || 'Aucune description.'}</p>
        {item.source === 'admin' && <p className="mt-1 inline-flex rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">Saisie par l’administration</p>}
        {item.decisionNote && <p className="mt-1">Motif : {item.decisionNote}</p>}
        {item.status === 'pending' && <button type="button" disabled={busy} onClick={() => { if (window.confirm('Annuler cette déclaration en attente ?')) void send('PATCH', { action: 'cancel', id: item.id, version: item.version }); }} className="mt-2 text-primary underline">Annuler ma déclaration</button>}
      </article>)}
      {expanded && hasMore && <button type="button" disabled={loading} onClick={() => setPage((n) => n + 1)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">Charger plus de prestations</button>}
    </>}
  </section>;
}
