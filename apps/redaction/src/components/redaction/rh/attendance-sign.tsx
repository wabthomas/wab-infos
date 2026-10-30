'use client';

import { useEffect, useState } from 'react';
import { LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import type { Attendance } from '@/lib/redaction/rh/attendance';

export function AttendanceSign() {
  const [rows, setRows] = useState<Attendance[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetchRedaction('/api/redaction/rh/mon-espace/presence', { cache: 'no-store' });
    if (response.ok) setRows((await response.json()).attendance ?? []);
  }

  useEffect(() => {
    void load().catch(() => setError('Impossible de charger vos pointages.'));
  }, []);

  async function sign(action: 'in' | 'out') {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/mon-espace/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Pointage impossible.');
      setMessage(action === 'in' ? 'Arrivée signée.' : 'Sortie signée.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pointage impossible.');
    } finally {
      setBusy(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayRow = rows.find((row) => row.workDate === today);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Signer ma présence</h2>
        
        {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        {message && <p role="status" className="mt-3 text-sm text-primary">{message}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || Boolean(todayRow?.checkIn)}
            onClick={() => void sign('in')}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" /> Signer l’arrivée
          </button>
          <button
            type="button"
            disabled={busy || !todayRow?.checkIn || Boolean(todayRow?.checkOut)}
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
        <h2 className="text-sm font-bold">Historique récent</h2>
        <div className="mt-3 space-y-2">
          {rows.length === 0 ? (
            <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">Aucun pointage enregistré.</p>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
                <span className="font-medium">{row.workDate}</span>
                <span className="inline-flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Arrivée {row.checkIn ?? '—'}</span>
                  <span>Sortie {row.checkOut ?? '—'}</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
