'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { validateAbsence, type Absence, type AbsenceStatus } from '@/lib/redaction/rh/absences';

const labels: Record<AbsenceStatus, string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Refusée',
  cancelled: 'Annulée',
};

export function MyAbsences() {
  const [person, setPerson] = useState<{ id: string; firstName: string; lastName: string } | null>(null);
  const [items, setItems] = useState<Absence[]>([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchRedaction('/api/redaction/rh/mon-espace', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        setPerson(data.person);
        setItems(data.absences);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setPerson(null);
          setItems([]);
          setError('Espace RH indisponible ou accès retiré. Contactez l’administrateur.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!person || !validateAbsence({ collaboratorId: person.id, startDate: start, endDate: end, category })) {
      setError('Vérifiez le type et les dates (durée maximale : 366 jours).');
      return;
    }
    setBusy(true);
    try {
      const response = await fetchRedaction('/api/redaction/rh/mon-espace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: start, endDate: end, category }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Envoi impossible.');
      setStart('');
      setEnd('');
      setCategory('');
      setMessage('Demande envoyée à l’administrateur.');
      setReload((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function cancel(item: Absence) {
    if (!window.confirm('Annuler cette demande en attente ?')) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/mon-espace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', id: item.id, version: item.version }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Annulation impossible.');
      setMessage('Demande annulée.');
      setReload((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Annulation impossible.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Chargement…</p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-bold">Mes demandes</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Suivez l’état de vos demandes d’absence.</p>
        </div>
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
        {message && <p role="status" className="text-sm text-primary">{message}</p>}
        {items.length === 0 ? (
          <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">Aucune demande enregistrée.</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{item.category}</p>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold">{labels[item.status]}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Du {item.startDate} au {item.endDate}</p>
              {item.decisionNote && <p className="mt-1 text-xs text-muted-foreground">Motif : {item.decisionNote}</p>}
              {item.status === 'pending' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void cancel(item)}
                  className="mt-2 text-xs font-semibold text-primary underline"
                >
                  Annuler ma demande
                </button>
              )}
            </article>
          ))
        )}
      </section>

      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-bold">Nouvelle demande</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ne saisissez pas de données médicales ou sensibles dans le motif.
          </p>
        </div>
        <label className="block text-sm font-medium">
          Type (ex. congé annuel)
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            maxLength={100}
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Du
            <input
              type="date"
              min="1900-01-01"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            Au
            <input
              type="date"
              min={start || '1900-01-01'}
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? 'Envoi…' : 'Envoyer la demande'}
        </button>
      </form>
    </div>
  );
}
