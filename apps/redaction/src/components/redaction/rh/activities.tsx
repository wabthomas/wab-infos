'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { daysToReview, isValidMonth, validateActivity, type Activity, type ActivityStatus } from '@/lib/redaction/rh/activities';
import type { Absence } from '@/lib/redaction/rh/absences';
import type { Collaborator } from '@/lib/redaction/rh/collaborator';

const labels: Record<ActivityStatus, string> = {
  effectuee: 'Prestation effectuée',
  absence_signalee: 'Absence signalée — à examiner',
  absence_justifiee: 'Absence justifiée (validation admin)',
};

export function Activities({ initialMonth, today }: { initialMonth: string; today: string }) {
  const [people, setPeople] = useState<Collaborator[]>([]);
  const [personId, setPersonId] = useState('');
  const [month, setMonth] = useState(initialMonth);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<ActivityStatus>('effectuee');
  const [description, setDescription] = useState('');
  const person = people.find((item) => item.id === personId);

  useEffect(() => {
    const controller = new AbortController();
    fetchRedaction('/api/redaction/rh/collaborateurs', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        const active = data.collaborators.filter((p: Collaborator) => !p.archived);
        setPeople(active);
        setPersonId((current) => active.some((p: Collaborator) => p.id === current) ? current : '');
      })
      .catch(() => { if (!controller.signal.aborted) setError('Impossible de charger les collaborateurs. Vérifiez la configuration RH.'); });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    const refresh = () => setReload((n) => n + 1);
    window.addEventListener('rh-collaborators-changed', refresh);
    window.addEventListener('rh-absences-changed', refresh);
    window.addEventListener('rh-submissions-changed', refresh);
    return () => { window.removeEventListener('rh-collaborators-changed', refresh); window.removeEventListener('rh-absences-changed', refresh); window.removeEventListener('rh-submissions-changed', refresh); };
  }, []);

  useEffect(() => {
    setActivities([]); setAbsences([]); setLoadFailed(false); setEditing(null); setDate(''); setDescription(''); setStatus('effectuee');
    if (!personId || !isValidMonth(month)) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError('');
    const query = new URLSearchParams({ collaboratorId: personId, month });
    Promise.all([
      fetchRedaction(`/api/redaction/rh/prestations?${query}`, { cache: 'no-store', signal: controller.signal }),
      fetchRedaction(`/api/redaction/rh/absences?${query}`, { cache: 'no-store', signal: controller.signal }),
    ])
      .then(async ([activityResponse, absenceResponse]) => {
        if (!activityResponse.ok || !absenceResponse.ok) throw new Error();
        const [activityData, absenceData] = await Promise.all([activityResponse.json(), absenceResponse.json()]);
        setActivities(activityData.activities);
        setAbsences(absenceData.absences);
      })
      .catch(() => { if (!controller.signal.aborted) { setLoadFailed(true); setError('Impossible de charger les prestations. Vérifiez la migration de la base RH.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [personId, month, reload]);

  const missing = person && isValidMonth(month) && !loading && !loadFailed
    ? daysToReview(month, today, person.startDate, activities.map((item) => item.date), absences) : [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('');
    const activity = validateActivity({ collaboratorId: personId, date, status, description });
    if (!activity || !date.startsWith(`${month}-`)) { setError('Vérifiez la date, le statut et la description.'); return; }
    setBusy(true);
    try {
      const response = await fetchRedaction('/api/redaction/rh/prestations', {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity, ...(editing ? { id: editing.id, version: editing.version } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');
      setMessage('Prestation enregistrée.'); setReload((n) => n + 1);
    } catch (err) { setError(err instanceof Error ? err.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  }

  return <section className="space-y-4 rounded-xl border border-border bg-card p-5">
    <div>
      <h2 className="font-display text-lg font-bold">Prestations et journées à vérifier</h2>
      <p className="mt-1 text-sm text-muted-foreground">Saisie par l’administrateur uniquement. Aucune retenue n’est calculée ni appliquée.</p>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">Collaborateur
        <select disabled={busy} value={personId} onChange={(event) => { setPersonId(event.target.value); setMessage(''); }} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2">
          <option value="">Sélectionner…</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.team}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">Mois
        <input disabled={busy} type="month" min="1900-01" max="9999-12" value={month} onChange={(event) => { setMonth(event.target.value); setMessage(''); }} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" />
      </label>
    </div>
    {person && <>
      {loading ? <p className="text-sm">Chargement…</p> : loadFailed ? null : <>
        <div className="rounded-lg bg-muted p-3 text-sm">
          {!person.startDate ? <p>Renseignez la date d’arrivée dans le dossier pour repérer les journées à vérifier.</p> : <>
            <p className="font-semibold">Journées sans relevé validé : {missing.length}</p>
            <p className="mt-1 text-muted-foreground">{missing.length ? missing.join(' · ') : 'Aucune journée sans relevé validé sur la période écoulée.'}</p>
          </>}
          <p className="mt-2 text-xs text-muted-foreground">Indicateur provisoire à partir de la date d’arrivée : dimanches exclus, jours fériés inclus. Les absences approuvées sont exclues ; les fins de contrat et autres exceptions ne sont pas encore gérées. Une journée signalée n’est pas nécessairement une absence injustifiée.</p>
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold">Relevés enregistrés</h3>
          {activities.length === 0 && <p className="text-sm text-muted-foreground">Aucun relevé pour ce mois.</p>}
          {activities.map((item) => <article key={item.id} className="rounded-lg border border-border p-3 text-sm">
            <p className="font-semibold">{item.date} — {labels[item.status]}</p>
            {item.description && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{item.description}</p>}
            <button disabled={busy} type="button" className="mt-2 font-semibold text-primary hover:underline" onClick={() => { setEditing(item); setDate(item.date); setStatus(item.status); setDescription(item.description); setError(''); setMessage(''); }}>Modifier</button>
          </article>)}
        </div>
        <form onSubmit={submit} className="space-y-3 border-t border-border pt-4">
          <h3 className="font-semibold">{editing ? 'Modifier le relevé' : 'Enregistrer un relevé journalier'}</h3>
          <p className="text-xs text-muted-foreground">Un relevé par jour : réunissez les activités du jour dans la description. N’y saisissez pas de données médicales ou sensibles.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Date
              <input type="date" required disabled={!!editing} min={`${month}-01`} max={today} value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" />
            </label>
            <label className="text-sm font-medium">Statut
              <select value={status} onChange={(event) => setStatus(event.target.value as ActivityStatus)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2">
                {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium">Description {status === 'effectuee' ? '(obligatoire)' : '(facultative)'}
            <input value={description} maxLength={500} required={status === 'effectuee'} onChange={(event) => setDescription(event.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" />
          </label>
          <div className="flex gap-3">
            <button disabled={busy} type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
            {editing && <button type="button" onClick={() => { setEditing(null); setDate(''); setDescription(''); setStatus('effectuee'); }} className="text-sm underline">Annuler</button>}
          </div>
        </form>
      </>}
    </>}
  </section>;
}
