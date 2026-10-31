'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { validateAttendanceCorrection, type Attendance, type AttendanceCorrection } from '@/lib/redaction/rh/attendance';

export function AttendanceSign({ today }: { today: string }) {
  const [rows, setRows] = useState<Attendance[]>([]);
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionDate, setCorrectionDate] = useState('');
  const [correctionIn, setCorrectionIn] = useState('');
  const [correctionOut, setCorrectionOut] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionBusy, setCorrectionBusy] = useState(false);
  const [correctionUnavailable, setCorrectionUnavailable] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const attendanceResponse = await fetchRedaction('/api/redaction/rh/mon-espace/presence', { cache: 'no-store' });
    if (!attendanceResponse.ok) throw new Error('Chargement des pointages impossible.');
    const attendanceData = await attendanceResponse.json();
    setRows(attendanceData.attendance ?? []);
    try {
      const correctionResponse = await fetchRedaction('/api/redaction/rh/mon-espace/presence/corrections', { cache: 'no-store' });
      if (!correctionResponse.ok) throw new Error();
      const correctionData = await correctionResponse.json();
      setCorrections(correctionData.corrections ?? []); setCorrectionUnavailable(false);
    } catch {
      setCorrectionUnavailable(true);
    }
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

  async function requestCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('');
    const correction = validateAttendanceCorrection({ workDate: correctionDate, checkIn: correctionIn, checkOut: correctionOut, reason: correctionReason }, today);
    if (!correction) { setError('Vérifiez la date, les heures et le motif (8 à 500 caractères).'); return; }
    setCorrectionBusy(true);
    try {
      const response = await fetchRedaction('/api/redaction/rh/mon-espace/presence/corrections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(correction) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Demande impossible.');
      setMessage('Demande transmise à l’administration RH. Le pointage ne change qu’après validation.');
      setCorrectionOpen(false); setCorrectionDate(''); setCorrectionIn(''); setCorrectionOut(''); setCorrectionReason('');
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Demande impossible.'); }
    finally { setCorrectionBusy(false); }
  }

  const todayRow = rows.find((row) => row.workDate === today);
  const minCorrectionDate = `${Number(today.slice(0, 4)) - 5}${today.slice(4)}`;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Signer ma présence</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Horaire de référence du lundi au samedi, jours fériés compris : 07:00–15:00 (heure de Kinshasa). Une arrivée après 07:00 est signalée pour suivi. Dès la fin de vos prestations, vous pouvez signer la sortie sans attendre 15:00. Les pauses ne sont pas pointées.
        </p>
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
        <button type="button" disabled={correctionUnavailable} onClick={() => { setCorrectionDate(today); setCorrectionOpen(true); setError(''); }} className="mt-3 min-h-11 w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Demander une correction de pointage</button>
        {correctionUnavailable && <p className="mt-2 text-xs text-muted-foreground">Les demandes de correction seront disponibles après application de la migration RH correspondante.</p>}
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
      {corrections.length > 0 && <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold">Mes demandes de correction</h2>
        <div className="mt-3 space-y-2">{corrections.map((correction) => <article key={correction.id} className="rounded-xl border border-border p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{correction.workDate}</p><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${correction.status === 'approved' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : correction.status === 'rejected' ? 'bg-red-500/10 text-red-700 dark:text-red-300' : 'bg-amber-500/10 text-amber-800 dark:text-amber-300'}`}>{correction.status === 'approved' ? 'Approuvée' : correction.status === 'rejected' ? 'Refusée' : 'En attente'}</span></div>
          <p className="mt-1 text-xs text-muted-foreground">{correction.checkIn ? `Arrivée demandée : ${correction.checkIn}` : ''}{correction.checkIn && correction.checkOut ? ' · ' : ''}{correction.checkOut ? `Sortie demandée : ${correction.checkOut}` : ''}</p>
          <p className="mt-1 text-xs">Motif : {correction.reason}</p>{correction.decisionNote && <p className="mt-1 text-xs text-muted-foreground">Réponse RH : {correction.decisionNote}</p>}{correction.history && <p className="mt-1 text-xs text-muted-foreground">Historique appliqué : arrivée {correction.history.beforeCheckIn ?? '—'} → {correction.history.afterCheckIn} · sortie {correction.history.beforeCheckOut ?? '—'} → {correction.history.afterCheckOut ?? '—'}</p>}
        </article>)}</div>
      </section>}
      {correctionOpen && <div className="fixed inset-0 z-[90] bg-black/55" onClick={() => { if (!correctionBusy) setCorrectionOpen(false); }}>
        <form onSubmit={requestCorrection} onClick={(event) => event.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[90dvh] space-y-4 overflow-y-auto rounded-t-3xl border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">Demande RH</p><h2 className="mt-1 font-display text-lg font-bold">Corriger un pointage</h2></div><button type="button" disabled={correctionBusy} aria-label="Fermer" onClick={() => setCorrectionOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg">×</button></div>
          <p className="text-xs leading-5 text-muted-foreground">Saisissez uniquement l’heure à corriger. Laissez l’autre vide pour la conserver. Le pointage initial reste inchangé jusqu’à la décision RH.</p>
          {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
          <label className="block text-sm font-semibold">Date<input type="date" required min={minCorrectionDate} max={today} value={correctionDate} onChange={(event) => setCorrectionDate(event.target.value)} className="mt-1.5 block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal" /></label>
          <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-semibold">Arrivée<input type="time" value={correctionIn} onChange={(event) => setCorrectionIn(event.target.value)} className="mt-1.5 block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal" /></label><label className="block text-sm font-semibold">Sortie<input type="time" value={correctionOut} onChange={(event) => setCorrectionOut(event.target.value)} className="mt-1.5 block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal" /></label></div>
          <label className="block text-sm font-semibold">Motif (8 à 500 caractères)<textarea required minLength={8} maxLength={500} value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} className="mt-1.5 block min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal" /></label>
          <button type="submit" disabled={correctionBusy} className="min-h-12 w-full rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">{correctionBusy ? 'Envoi…' : 'Envoyer à l’administration'}</button>
        </form>
      </div>}
    </div>
  );
}
