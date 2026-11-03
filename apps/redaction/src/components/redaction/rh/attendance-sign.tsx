'use client';
import { useRhNotice } from './use-rh-notice';

import { useEffect, useState } from 'react';
import { LogIn, LogOut, ShieldCheck, CircleCheck, CircleAlert } from 'lucide-react';
import { PersonalHistoryControls } from './personal-history-controls';
import { historyUrl, type HistoryPeriod } from '@/lib/redaction/rh/personal-history';
import { enqueue, pending, notifyQueue } from '@/lib/redaction/rh/offline-queue';
import { fetchRedaction } from '@/lib/redaction/public-path';
import type { Attendance } from '@/lib/redaction/rh/attendance';
import { kinshasaToday } from '@/lib/redaction/rh/activities';

export function AttendanceSign({ owner }: { owner: string }) {
  const [rows, setRows] = useState<Attendance[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<{ period: Exclude<HistoryPeriod, 'recent'>; value: string }>({ period: 'all', value: '' });
  const [history, setHistory] = useState<Attendance[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useRhNotice('error');
  const [reload, setReload] = useState(0);
  const [error, setError] = useRhNotice('error');
  const [message, setMessage] = useRhNotice('success');
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState<Awaited<ReturnType<typeof pending>>>([]);

  async function load() {
    const response = await fetchRedaction(historyUrl('/api/redaction/rh/mon-espace/presence', 'recent'), { cache: 'no-store' });
    if (!response.ok) throw new Error('Pointages indisponibles.');
    const attendance = (await response.json()).attendance ?? [];
      setRows(attendance);
      const today = kinshasaToday();
      const row = attendance.find((item: Attendance) => item.workDate === today);
      try { localStorage.setItem(`redaction-presence-${owner}-${today}`, JSON.stringify({ in: Boolean(row?.checkIn), out: Boolean(row?.checkOut) })); } catch {}
  }

  useEffect(() => {
    const refresh = () => { void pending(owner).then(setQueued).catch(() => setError('Stockage hors ligne indisponible.')); };
    refresh(); window.addEventListener('rh-offline-queue', refresh);
    return () => window.removeEventListener('rh-offline-queue', refresh);
  }, [owner]);

  useEffect(() => {
    void load().catch(() => setError('Impossible de charger vos pointages.'));
  }, [reload]);

  useEffect(() => {
    if (!expanded) return;
    if ((filter.period === 'month' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(filter.value)) || (filter.period === 'year' && !/^(19|20)\d{2}$/.test(filter.value))) { setHistory([]); setHasMore(false); setHistoryLoading(false); return; }
    const controller = new AbortController();
    setHistoryLoading(true); setHistoryError('');
    fetchRedaction(historyUrl('/api/redaction/rh/mon-espace/presence', filter.period, filter.value, page), { cache: 'no-store', signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); const data = await response.json();
        setHistory((previous) => page === 1 ? data.attendance : [...previous, ...data.attendance.filter((row: Attendance) => !previous.some((old) => old.id === row.id))]);
        setHasMore(data.hasMore);
      })
      .catch(() => { if (!controller.signal.aborted) setHistoryError('Impossible de charger l’historique. Réessayez.'); })
      .finally(() => { if (!controller.signal.aborted) setHistoryLoading(false); });
    return () => controller.abort();
  }, [expanded, filter, page, reload]);

  async function sign(action: 'in' | 'out') {
    setBusy(true);
    setError('');
    setMessage('');
    const recordedAt = new Date().toISOString();
    try {
      if (!navigator.onLine || (action === 'out' && queuedIn)) throw new TypeError('Offline');
      const response = await fetchRedaction('/api/redaction/rh/mon-espace/presence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, recordedAt }),
      });
      const data = await response.json();
      if (!response.ok) { if ([502, 503, 504].includes(response.status)) throw new TypeError('Server unavailable'); throw new Error(data.error || 'Pointage impossible.'); }
      setMessage(action === 'in' ? 'Arrivée signée.' : 'Sortie signée.');
      setHistory([]); setPage(1); setReload((n) => n + 1);
    } catch (e) {
      if (e instanceof TypeError) {
        try {
          await enqueue({ id: crypto.randomUUID(), owner, kind: action, recordedAt });
          notifyQueue(); setMessage('Pointage conservé sur cet appareil, en attente de synchronisation (heure déclarée, à vérifier).');
        } catch { setError('Impossible de conserver le pointage sur cet appareil. Réessayez.'); }
      } else setError(e instanceof Error ? e.message : 'Pointage impossible.');
    } finally {
      setBusy(false);
    }
  }

  const today = kinshasaToday();
  const todayPointages = queued.filter((op) => (op.kind === 'in' || op.kind === 'out') && kinshasaToday(new Date(op.recordedAt)) === today);
  const queuedIn = todayPointages.some((op) => op.kind === 'in');
  const queuedOut = todayPointages.some((op) => op.kind === 'out');
  const todayRow = rows.find((row) => row.workDate === today);
  const shown = expanded ? history : rows;

  return (
    <div className="space-y-4">
      {queued.filter((op) => op.kind === 'in' || op.kind === 'out').length > 0 && <p role="status" className="text-sm text-amber-700">{queued.filter((op) => op.kind === 'in' || op.kind === 'out').length} pointage(s) en attente sur cet appareil.</p>}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Signer ma présence</h2>
        
        {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        {message && <p role="status" className="mt-3 text-sm text-primary">{message}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || (Boolean(todayRow?.checkIn) || queuedIn)}
            onClick={() => void sign('in')}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" /> Signer l’arrivée
          </button>
          <button
            type="button"
            disabled={busy || (!todayRow?.checkIn && !queuedIn) || Boolean(todayRow?.checkOut) || queuedOut}
            onClick={() => void sign('out')}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" /> Signer la sortie
          </button>
        </div>
        <p className="mt-4 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          Aujourd’hui : arrivée {todayRow?.checkIn ?? '—'} · sortie {todayRow?.checkOut ?? '—'}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-bold">{expanded ? 'Tous mes pointages' : 'Pointages de la semaine'}</h2>
          <button type="button" aria-expanded={expanded} className="text-sm font-semibold text-primary underline" onClick={() => { setExpanded(!expanded); setPage(1); setHistory([]); setHistoryError(''); }}>{expanded ? 'Réduire' : 'Voir plus'}</button></div>
        {expanded && <div className="mt-4"><PersonalHistoryControls filter={filter} onChange={(next) => { setFilter(next); setPage(1); setHistory([]); }} /></div>}
        {historyError && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{historyError}</p>}
        <div className="mt-3 space-y-2">
          {shown.length === 0 && !historyLoading && !historyError ? (
            <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">Aucun pointage pour cette période.</p>
          ) : (
            shown.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
                <span className="flex items-center gap-2 font-medium">{row.checkIn ? <CircleCheck aria-label="Présence pointée" className="h-4 w-4 text-emerald-600" /> : <CircleAlert aria-label="Arrivée non pointée" className="h-4 w-4 text-amber-600" />}{row.workDate}</span>
                <span className="inline-flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Arrivée {row.checkIn ?? '—'}</span>
                  <span>Sortie {row.checkOut ?? '—'}</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                </span>
              </div>
            ))
          )}
        </div>
        {expanded && historyLoading && <p role="status" className="mt-3 text-sm text-muted-foreground">Chargement…</p>}
        {expanded && hasMore && <button type="button" disabled={historyLoading} onClick={() => setPage((n) => n + 1)} className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">Charger plus de pointages</button>}
      </section>
    </div>
  );
}
