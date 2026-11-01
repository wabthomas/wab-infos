'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, Clock3, UsersRound } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import type { Collaborator } from '@/lib/redaction/rh/collaborator';
import { assessArrival, ATTENDANCE_END_TIME, ATTENDANCE_START_TIME, validateAttendanceCorrection, type AttendanceCorrection, type TeamAttendance } from '@/lib/redaction/rh/attendance';

function monthRange(month: string): { from: string; to: string } | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, value] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, value, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
}

function isExcused(row: TeamAttendance): boolean {
  return row.absenceStatuses?.includes('approved') === true || row.activityStatus === 'absence_justifiee';
}

function activityLabel(status: string | null): string {
  return ({ effectuee: 'Prestation enregistrée', absence_signalee: 'Absence signalée', absence_justifiee: 'Absence justifiée' } as Record<string, string>)[status ?? ''] ?? 'Aucun relevé';
}

function absenceLabel(statuses: string[] | undefined): string {
  if (!statuses?.length) return 'Aucune demande';
  return [...new Set(statuses.map((status) => ({ pending: 'En attente', approved: 'Approuvée', rejected: 'Refusée', cancelled: 'Annulée' } as Record<string, string>)[status] ?? status))].join(', ');
}

function submissionLabel(status: string | null): string {
  return ({ pending: 'En attente de validation', approved: 'Validée', rejected: 'Refusée', cancelled: 'Annulée' } as Record<string, string>)[status ?? ''] ?? 'Aucune déclaration';
}

function historyLabel(history: AttendanceCorrection['history']): string {
  if (!history) return '';
  return `Arrivée ${history.beforeCheckIn ?? '—'} → ${history.afterCheckIn} · Sortie ${history.beforeCheckOut ?? '—'} → ${history.afterCheckOut ?? '—'} · par ${history.actor}`;
}

export function AttendanceReview({ initialMonth, today }: { initialMonth: string; today: string }) {
  const [month, setMonth] = useState(initialMonth);
  const [personId, setPersonId] = useState('');
  const [people, setPeople] = useState<Collaborator[]>([]);
  const [rows, setRows] = useState<TeamAttendance[]>([]);
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [correctionsUnavailable, setCorrectionsUnavailable] = useState(false);
  const [correctionFilter, setCorrectionFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [reviewing, setReviewing] = useState<AttendanceCorrection | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [directOpen, setDirectOpen] = useState(false);
  const [directPersonId, setDirectPersonId] = useState('');
  const [directDate, setDirectDate] = useState('');
  const [directIn, setDirectIn] = useState('');
  const [directOut, setDirectOut] = useState('');
  const [directReason, setDirectReason] = useState('');
  const [directBusy, setDirectBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetchRedaction('/api/redaction/rh/collaborateurs', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json() as { collaborators?: Collaborator[] };
        setPeople((data.collaborators ?? []).filter((person) => !person.archived));
      })
      .catch(() => { if (!controller.signal.aborted) setError('Impossible de charger les collaborateurs.'); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const range = monthRange(month);
    if (!range) { setError('Choisissez un mois valide.'); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError(''); setRows([]); setTruncated(false);
    const params = new URLSearchParams({ ...range, ...(personId ? { collaboratorId: personId } : {}) });
    fetchRedaction(`/api/redaction/rh/presence?${params}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Chargement des pointages impossible.');
        setRows(data.attendance ?? []); setTruncated(Boolean(data.truncated));
      })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Chargement impossible.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month, personId, reload]);

  useEffect(() => {
    const range = monthRange(month);
    if (!range) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ ...range, status: correctionFilter });
    fetchRedaction(`/api/redaction/rh/presence/corrections?${params}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        setCorrections(data.corrections ?? []); setCorrectionsUnavailable(false);
      })
      .catch(() => { if (!controller.signal.aborted) { setCorrections([]); setCorrectionsUnavailable(true); } });
    return () => controller.abort();
  }, [month, correctionFilter, reload]);

  async function decideCorrection(decision: 'approve' | 'reject') {
    if (!reviewing) return;
    if (decision === 'reject' && reviewNote.trim().length < 8) { setError('Un motif de refus de 8 caractères minimum est requis.'); return; }
    setError(''); setReviewBusy(true);
    try {
      const response = await fetchRedaction('/api/redaction/rh/presence/corrections', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: reviewing.id, version: reviewing.version, decision, note: reviewNote.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Décision impossible.');
      setReviewing(null); setReviewNote(''); setNotice(decision === 'approve' ? 'Correction approuvée et historique enregistré.' : 'Demande refusée ; motif conservé dans l’historique.'); setReload((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Décision impossible.'); }
    finally { setReviewBusy(false); }
  }

  async function submitDirectCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const correction = validateAttendanceCorrection({ workDate: directDate, checkIn: directIn, checkOut: directOut, reason: directReason }, today);
    if (!directPersonId || !correction) { setError('Sélectionnez un collaborateur et vérifiez la date, les heures et le motif.'); return; }
    setDirectBusy(true);
    try {
      const response = await fetchRedaction('/api/redaction/rh/presence/corrections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ collaboratorId: directPersonId, ...correction }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Correction impossible.');
      setDirectOpen(false); setMonth(directDate.slice(0, 7)); setDirectDate(''); setDirectIn(''); setDirectOut(''); setDirectReason(''); setNotice('Correction administrative enregistrée avec motif et historique.'); setReload((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Correction impossible.'); }
    finally { setDirectBusy(false); }
  }

  const minCorrectionDate = `${Number(today.slice(0, 4)) - 5}${today.slice(4)}`;
  const stats = useMemo(() => ({
    days: new Set(rows.map((row) => row.workDate)).size,
    people: new Set(rows.map((row) => row.collaboratorId)).size,
    incomplete: rows.filter((row) => row.checkIn && !row.checkOut).length,
    afterStart: rows.filter((row) => assessArrival(row.checkIn, isExcused(row), row.workDate) === 'late').length,
  }), [rows]);

  return <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
    <div>
      <h2 className="font-display text-lg font-bold">Pointages de présence</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">Horaire de référence du lundi au samedi, y compris les jours fériés : arrivée à {ATTENDANCE_START_TIME}, fin indicative à {ATTENDANCE_END_TIME} (heure de Kinshasa). Le dimanche est hors horaire régulier. Une arrivée après 07:00 est signalée comme tardive, sauf absence approuvée ; la sortie peut être signée dès la fin des prestations, sans attendre 15:00.</p>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-semibold">Mois
        <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="mt-1.5 block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal" />
      </label>
      <label className="block text-sm font-semibold">Collaborateur
        <select value={personId} onChange={(event) => setPersonId(event.target.value)} className="mt-1.5 block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal">
          <option value="">Toute l’équipe</option>
          {people.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName} · {person.team}</option>)}
        </select>
      </label>
    </div>

    {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-primary/[0.06] p-3 text-sm text-primary">{notice}</p>}
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <button type="button" disabled={correctionsUnavailable} onClick={() => { setDirectPersonId(personId); setDirectDate(today); setDirectIn(''); setDirectOut(''); setDirectReason(''); setError(''); setDirectOpen(true); }} className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Ajouter / corriger un pointage</button>
      <label className="block text-sm font-semibold">Demandes de correction
        <select value={correctionFilter} disabled={correctionsUnavailable} onChange={(event) => setCorrectionFilter(event.target.value as typeof correctionFilter)} className="mt-1.5 block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal sm:w-52"><option value="pending">En attente</option><option value="approved">Approuvées</option><option value="rejected">Refusées</option><option value="all">Toutes</option></select>
      </label>
    </div>
    {correctionsUnavailable && <p className="text-xs text-muted-foreground">Les corrections nécessitent l’application de la migration RH de suivi et d’historique.</p>}

    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      <div className="rounded-xl bg-muted/70 p-3"><CalendarDays className="h-4 w-4 text-primary" /><p className="mt-2 text-lg font-bold tabular-nums">{stats.days}</p><p className="text-[10px] leading-4 text-muted-foreground">Jours pointés</p></div>
      <div className="rounded-xl bg-muted/70 p-3"><UsersRound className="h-4 w-4 text-primary" /><p className="mt-2 text-lg font-bold tabular-nums">{stats.people}</p><p className="text-[10px] leading-4 text-muted-foreground">Collaborateurs</p></div>
      <div className="rounded-xl bg-muted/70 p-3"><Clock3 className="h-4 w-4 text-primary" /><p className="mt-2 text-lg font-bold tabular-nums">{stats.incomplete}</p><p className="text-[10px] leading-4 text-muted-foreground">Sorties manquantes</p></div>
      <div className="rounded-xl bg-muted/70 p-3"><Clock3 className="h-4 w-4 text-primary" /><p className="mt-2 text-lg font-bold tabular-nums">{stats.afterStart}</p><p className="text-[10px] leading-4 text-muted-foreground">Après 07:00</p></div>
    </div>

    {loading ? <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">Chargement des pointages…</p> : rows.length === 0 ? <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">Aucun pointage enregistré pour ce filtre.</p> : <>
      <div className="space-y-2 sm:hidden">
        {rows.map((row) => <article key={row.id} className="rounded-xl border border-border bg-background p-3.5">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{row.firstName} {row.lastName}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{row.jobTitle} · {row.team}</p></div><time dateTime={row.workDate} className="shrink-0 text-right text-xs font-semibold tabular-nums">{row.workDate}</time></div>
          <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg bg-muted/60 px-3 py-2"><p className="text-[10px] text-muted-foreground">Arrivée · Kinshasa</p><p className="mt-0.5 font-bold tabular-nums">{row.checkIn ?? '—'}</p></div><div className="rounded-lg bg-muted/60 px-3 py-2"><p className="text-[10px] text-muted-foreground">Sortie · Kinshasa</p><p className="mt-0.5 font-bold tabular-nums">{row.checkOut ?? '—'}</p></div></div>
          <div className="mt-2 grid gap-1 text-xs text-muted-foreground"><p>Relevé : {activityLabel(row.activityStatus)}</p><p>Déclaration : {submissionLabel(row.submissionStatus)}</p><p>Absence : {absenceLabel(row.absenceStatuses)}</p></div>
          {assessArrival(row.checkIn, isExcused(row), row.workDate) === 'late' && <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">Arrivée après 07:00</p>}
          {row.checkIn && !row.checkOut && <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">Pointage incomplet</p>}
        </article>)}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-muted/70 text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Collaborateur</th><th className="px-4 py-3 font-semibold">Fonction / équipe</th><th className="px-4 py-3 font-semibold">Arrivée</th><th className="px-4 py-3 font-semibold">Sortie</th><th className="px-4 py-3 font-semibold">Relevé</th><th className="px-4 py-3 font-semibold">Déclaration</th><th className="px-4 py-3 font-semibold">Absence</th><th className="px-4 py-3 font-semibold">Repère</th></tr></thead>
          <tbody className="divide-y divide-border">{rows.map((row) => <tr key={row.id}><td className="px-4 py-3 tabular-nums">{row.workDate}</td><td className="px-4 py-3 font-semibold">{row.firstName} {row.lastName}</td><td className="px-4 py-3 text-muted-foreground">{row.jobTitle} · {row.team}</td><td className="px-4 py-3 tabular-nums">{row.checkIn ?? '—'}</td><td className="px-4 py-3 tabular-nums">{row.checkOut ?? '—'}</td><td className="px-4 py-3 text-xs">{activityLabel(row.activityStatus)}</td><td className="px-4 py-3 text-xs">{submissionLabel(row.submissionStatus)}</td><td className="px-4 py-3 text-xs">{absenceLabel(row.absenceStatuses)}</td><td className="px-4 py-3">{assessArrival(row.checkIn, isExcused(row), row.workDate) === 'late' ? <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">Après 07:00</span> : row.checkIn && !row.checkOut ? <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">Sortie manquante</span> : assessArrival(row.checkIn, isExcused(row), row.workDate) === 'not_scheduled' ? <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">Dimanche · hors horaire</span> : row.checkIn ? <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Pointé</span> : '—'}</td></tr>)}</tbody>
        </table>
      </div>
      {truncated && <p className="text-xs text-muted-foreground">Affichage limité aux 2 000 pointages les plus récents. Réduisez la période ou filtrez par collaborateur.</p>}
    </>}
    <section className="space-y-3 rounded-xl border border-border bg-background p-3 sm:p-4">
      <div><h3 className="font-semibold">Corrections · {correctionFilter === 'pending' ? 'en attente' : correctionFilter === 'all' ? 'tous les statuts' : correctionFilter === 'approved' ? 'approuvées' : 'refusées'}</h3><p className="mt-1 text-xs text-muted-foreground">Toute correction approuvée conserve les heures précédentes, les nouvelles heures, le motif et l’identité de l’auteur dans l’historique RH.</p></div>
      {!correctionsUnavailable && corrections.length === 0 && <p className="text-sm text-muted-foreground">Aucune demande pour ce mois et ce filtre.</p>}
      {corrections.map((item) => <article key={item.id} className="rounded-xl border border-border p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{item.firstName} {item.lastName} · {item.workDate}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.source === 'employee' ? 'Demande collaborateur' : 'Correction directe admin'} · {item.checkIn ? `Arrivée ${item.checkIn}` : ''}{item.checkIn && item.checkOut ? ' · ' : ''}{item.checkOut ? `Sortie ${item.checkOut}` : ''}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'pending' ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300' : item.status === 'approved' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/10 text-red-700 dark:text-red-300'}`}>{item.status === 'pending' ? 'En attente' : item.status === 'approved' ? 'Approuvée' : 'Refusée'}</span></div><p className="mt-2">Motif : {item.reason}</p>{item.decisionNote && <p className="mt-1 text-xs text-muted-foreground">Décision : {item.decisionNote}</p>}{item.history && <p className="mt-1 text-xs text-muted-foreground">Historique : {historyLabel(item.history)}</p>}{item.status === 'pending' && <button type="button" onClick={() => { setReviewing(item); setReviewNote(''); setError(''); }} className="mt-3 min-h-11 w-full rounded-xl border border-primary/25 bg-primary/[0.06] px-4 font-semibold text-primary">Examiner et décider</button>}</article>)}
    </section>
    <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs leading-5 text-amber-900 dark:text-amber-200">Un jour sans pointage n’est pas automatiquement une absence. Le repère « après 07:00 » est indicatif et ne déclenche aucune sanction automatique. Les pauses ne sont pas suivies. Les demandes de correction sont tracées ; aucune sortie n’est exigée à 15:00 si les prestations sont terminées.</p>
    {directOpen && <div className="fixed inset-0 z-[90] bg-black/55" onClick={() => { if (!directBusy) setDirectOpen(false); }}>
      <form onSubmit={submitDirectCorrection} onClick={(event) => event.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[92dvh] space-y-4 overflow-y-auto rounded-t-3xl border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">Écriture administrative</p><h3 className="mt-1 font-display text-lg font-bold">Ajouter / corriger un pointage</h3></div><button type="button" disabled={directBusy} aria-label="Fermer" onClick={() => setDirectOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg">×</button></div>
        <p className="text-xs leading-5 text-muted-foreground">L’ancienne valeur, la nouvelle valeur, le motif et l’auteur sont conservés. Les heures saisies sont interprétées en heure de Kinshasa. Pour préserver une heure, laissez son champ vide.</p>
        {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        <label className="block text-sm font-semibold">Collaborateur<select required value={directPersonId} onChange={(event) => setDirectPersonId(event.target.value)} className="mt-1.5 block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal"><option value="">Sélectionner…</option>{people.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName} · {person.team}</option>)}</select></label>
        <label className="block text-sm font-semibold">Date<input required type="date" min={minCorrectionDate} max={today} value={directDate} onChange={(event) => setDirectDate(event.target.value)} className="mt-1.5 block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal" /></label>
        <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-semibold">Arrivée corrigée<input type="time" value={directIn} onChange={(event) => setDirectIn(event.target.value)} className="mt-1.5 block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal" /></label><label className="block text-sm font-semibold">Sortie corrigée<input type="time" value={directOut} onChange={(event) => setDirectOut(event.target.value)} className="mt-1.5 block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal" /></label></div>
        <label className="block text-sm font-semibold">Motif (8 à 500 caractères)<textarea required minLength={8} maxLength={500} value={directReason} onChange={(event) => setDirectReason(event.target.value)} className="mt-1.5 block min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal" /></label>
        <button type="submit" disabled={directBusy} className="min-h-12 w-full rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">{directBusy ? 'Enregistrement…' : 'Enregistrer avec historique'}</button>
      </form>
    </div>}
    {reviewing && <div className="fixed inset-0 z-[90] bg-black/55" onClick={() => { if (!reviewBusy) setReviewing(null); }}>
      <section role="dialog" aria-modal="true" aria-label="Examiner une demande de correction" onClick={(event) => event.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[90dvh] space-y-4 overflow-y-auto rounded-t-3xl border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">Demande collaborateur</p><h3 className="mt-1 font-display text-lg font-bold">{reviewing.firstName} {reviewing.lastName} · {reviewing.workDate}</h3></div><button type="button" disabled={reviewBusy} aria-label="Fermer" onClick={() => setReviewing(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg disabled:opacity-50">×</button></div>
        <p className="rounded-xl bg-muted/60 p-3 text-sm">Heures demandées : {reviewing.checkIn ? `arrivée ${reviewing.checkIn}` : ''}{reviewing.checkIn && reviewing.checkOut ? ' · ' : ''}{reviewing.checkOut ? `sortie ${reviewing.checkOut}` : ''}</p>
        <p className="text-sm leading-6">Motif : {reviewing.reason}</p>
        {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        <label className="block text-sm font-semibold">Note de décision<textarea maxLength={500} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Obligatoire en cas de refus (8 caractères minimum)" className="mt-1.5 block min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal" /></label>
        <div className="grid grid-cols-2 gap-3"><button type="button" disabled={reviewBusy} onClick={() => void decideCorrection('approve')} className="min-h-12 rounded-xl bg-primary px-3 font-semibold text-primary-foreground disabled:opacity-50">{reviewBusy ? 'Traitement…' : 'Approuver'}</button><button type="button" disabled={reviewBusy} onClick={() => void decideCorrection('reject')} className="min-h-12 rounded-xl border border-red-500/30 px-3 font-semibold text-red-700 dark:text-red-300 disabled:opacity-50">Refuser</button></div>
      </section>
    </div>}
  </section>;
}
