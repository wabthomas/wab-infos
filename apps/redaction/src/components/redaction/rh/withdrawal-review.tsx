'use client';

import { useEffect, useState } from 'react';
import { ArrowDownUp, CheckCircle2, Clock3, Loader2, WalletCards } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { formatMinorUnits, type RhCurrency } from '@/lib/redaction/rh/money';
import { validateOpeningBalance } from '@/lib/redaction/rh/opening-balances';
import { validateWithdrawalDecision, type Balance, type Withdrawal } from '@/lib/redaction/rh/withdrawals';
import type { Collaborator } from '@/lib/redaction/rh/collaborator';

const labels = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Refusée',
  cancelled: 'Annulée',
  paid: 'Payée',
} as const;
const methods = {
  mobile_money: 'Mobile Money',
  virement: 'Virement',
  especes: 'Espèces',
  autre: 'Autre',
} as const;
const statusTones: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  approved: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  paid: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  rejected: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  cancelled: 'bg-muted text-muted-foreground',
};
const statusOrder: Record<string, number> = { pending: 0, approved: 1, paid: 2, rejected: 3, cancelled: 4 };

function withdrawalRef(withdrawal: Withdrawal): string {
  return withdrawal.paymentReference?.trim() || `#${withdrawal.id.slice(0, 8).toUpperCase()}`;
}

type Filter = 'all' | 'to_process' | 'paid';

export function WithdrawalReview({
  enabled,
  today,
  allowOpening,
  readOnly = false,
  initialCollaboratorId,
  initialCurrency,
}: {
  enabled: boolean;
  today: string;
  allowOpening: boolean;
  readOnly?: boolean;
  initialCollaboratorId?: string;
  initialCurrency?: RhCurrency;
}) {
  const [people, setPeople] = useState<Collaborator[]>([]);
  const [person, setPerson] = useState(initialCollaboratorId ?? '');
  const [balances, setBalances] = useState<Balance[]>([]);
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<RhCurrency>(initialCurrency ?? 'CDF');
  const [filter, setFilter] = useState<Filter>('to_process');
  const [openingCurrency, setOpeningCurrency] = useState<RhCurrency>(initialCurrency ?? 'CDF');
  const [openingMonth, setOpeningMonth] = useState(today.slice(0, 7));
  const [openingAmount, setOpeningAmount] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [dates, setDates] = useState<Record<string, string>>({});
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetchRedaction('/api/redaction/rh/collaborateurs', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        const active = data.collaborators.filter((entry: Collaborator) => !entry.archived);
        setPeople(active);
        setPerson((current) => {
          const candidate = initialCollaboratorId || current;
          return active.some((entry: Collaborator) => entry.id === candidate) ? candidate : '';
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Impossible de charger les collaborateurs.');
      });
    return () => controller.abort();
  }, [enabled, reload, initialCollaboratorId]);

  useEffect(() => {
    setItems([]);
    setBalances([]);
    setFailed(false);
    setNotes({});
    setDates({});
    setRefs({});
    if (!enabled || !person) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchRedaction(`/api/redaction/rh/retraits?${new URLSearchParams({ collaboratorId: person })}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        setItems(data.withdrawals ?? []);
        setBalances(data.balances ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailed(true);
          setError('Impossible de charger les retraits.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled, person, reload]);

  async function openBalance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    const body = { collaboratorId: person, currency: openingCurrency, throughMonth: openingMonth, amount: openingAmount, confirmed };
    if (!validateOpeningBalance(body, today.slice(0, 7))) {
      setError('Vérifiez le solde, le mois et la confirmation.');
      return;
    }
    if (
      !window.confirm(
        'Confirmer ce solde initial définitif ? Les rémunérations jusqu’au mois indiqué sont incluses dans ce montant et ne seront pas ajoutées à nouveau.'
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetchRedaction('/api/redaction/rh/soldes-initiaux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Initialisation impossible.');
      setOpeningAmount('');
      setConfirmed(false);
      setMessage('Solde initial établi.');
      setReload((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Initialisation impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function decide(item: Withdrawal, action: 'approve' | 'reject' | 'pay') {
    const raw = {
      action,
      note: notes[item.id] ?? '',
      paymentDate: dates[item.id] ?? '',
      paymentReference: refs[item.id] ?? '',
    };
    if (
      action === 'pay' &&
      (item.method === 'mobile_money' || item.method === 'virement') &&
      !raw.paymentReference.trim()
    ) {
      setError('La référence est obligatoire pour ce moyen de paiement.');
      return;
    }
    if (!validateWithdrawalDecision(raw, today)) {
      setError('Vérifiez les champs : motif obligatoire pour le refus, date valide pour le paiement.');
      return;
    }
    if (
      !window.confirm(
        action === 'pay'
          ? 'Confirmer que le paiement a déjà été effectué hors du système ? Cette action est définitive.'
          : action === 'approve'
            ? 'Approuver cette demande ?'
            : 'Refuser cette demande et libérer le montant réservé ?'
      )
    ) {
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/retraits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...raw, id: item.id, version: item.version }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Opération impossible.');
      setMessage('Décision enregistrée.');
      setReload((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opération impossible.');
    } finally {
      setBusy(false);
    }
  }

  const selected = people.find((entry) => entry.id === person);
  const balance = balances.find((entry) => entry.currency === displayCurrency) ?? null;
  const available =
    !balance || balance.available === null ? null : formatMinorUnits(BigInt(balance.available), displayCurrency);
  const pendingCount = items.filter((item) => item.status === 'pending').length;
  const approvedCount = items.filter((item) => item.status === 'approved').length;
  const paidCount = items.filter((item) => item.status === 'paid').length;
  const visibleItems = items
    .filter((item) =>
      filter === 'all'
        ? true
        : filter === 'paid'
          ? item.status === 'paid'
          : item.status === 'pending' || item.status === 'approved'
    )
    .sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));

  if (!enabled) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Demandes de retrait</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Retraits désactivés. Activez <code className="rounded bg-muted px-1">REDACTION_RH_WITHDRAWALS_ENABLED</code> pour
          les utiliser.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Demandes de retrait</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Suivi manuel : aucun transfert d’argent n’est effectué par le système.
            </p>
          </div>
          <label className="w-full text-sm font-medium sm:w-80">
            Collaborateur
            <select
              disabled={busy}
              value={person}
              onChange={(event) => {
                setPerson(event.target.value);
                setOpeningAmount('');
                setConfirmed(false);
                setMessage('');
              }}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
            >
              <option value="">Sélectionner…</option>
              {people.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.firstName} {entry.lastName} — {entry.team}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        {message && <p role="status" className="mt-3 text-sm text-primary">{message}</p>}
      </section>

      {person && (
        <>
          <section className="relative overflow-hidden rounded-2xl bg-[#191923] p-5 text-white shadow-sm sm:p-6">
            <div aria-hidden className="pointer-events-none absolute -right-8 -top-20 h-52 w-52 rounded-full border border-white/[0.07] bg-white/[0.03]" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-300">Solde disponible</p>
                <p className="mt-1 text-3xl font-bold tabular-nums sm:text-4xl">
                  {loading ? <Loader2 className="h-7 w-7 animate-spin text-zinc-400" /> : available ?? 'Non établi'}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {selected ? `${selected.firstName} ${selected.lastName}` : 'Collaborateur'} · {displayCurrency}
                </p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="flex rounded-full border border-white/10 bg-white/[0.06] p-1">
                  {(['USD', 'CDF'] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setDisplayCurrency(code)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                        displayCurrency === code ? 'bg-white text-[#191923]' : 'text-zinc-300 hover:text-white'
                      }`}
                      aria-pressed={displayCurrency === code}
                    >
                      {code}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-amber-200">
                    <Clock3 className="h-3 w-3" /> {pendingCount} en attente
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-400/15 px-2.5 py-1 text-sky-200">
                    <ArrowDownUp className="h-3 w-3" /> {approvedCount} approuvée(s)
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-emerald-200">
                    <CheckCircle2 className="h-3 w-3" /> {paidCount} payée(s)
                  </span>
                </div>
              </div>
            </div>
            {balance && balance.available !== null ? (
              <dl className="mt-5 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                <div className="rounded-xl bg-white/[0.06] p-3">
                  <dt className="text-zinc-400">Solde initial</dt>
                  <dd className="mt-0.5 font-semibold">
                    {balance.opening === null ? '—' : formatMinorUnits(BigInt(balance.opening), displayCurrency)}
                  </dd>
                </div>
                <div className="rounded-xl bg-white/[0.06] p-3">
                  <dt className="text-zinc-400">Rémunérations validées</dt>
                  <dd className="mt-0.5 font-semibold">{formatMinorUnits(BigInt(balance.validated), displayCurrency)}</dd>
                </div>
                <div className="rounded-xl bg-white/[0.06] p-3">
                  <dt className="text-zinc-400">Réservé</dt>
                  <dd className="mt-0.5 font-semibold">{formatMinorUnits(BigInt(balance.reserved), displayCurrency)}</dd>
                </div>
                <div className="rounded-xl bg-white/[0.06] p-3">
                  <dt className="text-zinc-400">Payé</dt>
                  <dd className="mt-0.5 font-semibold">{formatMinorUnits(BigInt(balance.paid), displayCurrency)}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 rounded-xl bg-amber-400/10 p-3 text-xs leading-5 text-amber-200">
                Solde initial non établi : aucun retrait possible. Utilisez le formulaire ci-dessous après rapprochement des
                paiements historiques.
              </p>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ['to_process', 'À traiter'],
                ['paid', 'Payées'],
                ['all', 'Toutes'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  filter === value
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
                {value === 'to_process' ? ` (${pendingCount + approvedCount})` : value === 'paid' ? ` (${paidCount})` : ` (${items.length})`}
              </button>
            ))}
          </div>

          {allowOpening && (
            <form
              onSubmit={openBalance}
              className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5"
            >
              <div>
                <h3 className="text-sm font-bold">Établir un solde initial</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Après rapprochement des paiements historiques, saisissez le montant encore dû à la fin du mois choisi.
                  Les rémunérations jusqu’à ce mois ne seront pas additionnées. Cette opération est définitive ; une
                  correction passe par un ajustement distinct.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm">
                  Devise
                  <select
                    value={openingCurrency}
                    disabled={busy}
                    onChange={(event) => setOpeningCurrency(event.target.value as RhCurrency)}
                    className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <option>CDF</option>
                    <option>USD</option>
                  </select>
                </label>
                <label className="text-sm">
                  Jusqu’au mois inclus
                  <input
                    type="month"
                    min="1900-01"
                    max={today.slice(0, 7)}
                    value={openingMonth}
                    disabled={busy}
                    onChange={(event) => setOpeningMonth(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  Montant encore dû
                  <input
                    value={openingAmount}
                    disabled={busy}
                    required
                    inputMode="decimal"
                    maxLength={18}
                    onChange={(event) => setOpeningAmount(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
                  />
                </label>
              </div>
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={busy}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Je confirme avoir rapproché les paiements historiques et compris que ce solde ne peut pas être modifié ici.
                </span>
              </label>
              <button
                type="submit"
                disabled={busy || !confirmed}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Établir le solde initial
              </button>
            </form>
          )}

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold">Demandes</h3>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <WalletCards className="h-3.5 w-3.5" /> Numéro de suivi affiché pour chaque demande
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : failed ? null : visibleItems.length === 0 ? (
                <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                  Aucune demande dans cette vue.
                </p>
              ) : (
                visibleItems.map((item) => (
                  <article key={item.id} className="space-y-2 rounded-xl border border-border p-3.5 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          Retrait {withdrawalRef(item)} ·{' '}
                          {formatMinorUnits(BigInt(item.amountMinor), item.currency)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {methods[item.method]}
                          {item.paymentDate ? ` · payé le ${item.paymentDate}` : ''}
                          {item.paymentReference ? ` · référence : ${item.paymentReference}` : ''}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          statusTones[item.status] ?? 'bg-muted'
                        }`}
                      >
                        {labels[item.status]}
                      </span>
                    </div>
                    {item.decisionNote && <p className="text-[11px] text-muted-foreground">Motif : {item.decisionNote}</p>}
                    {!readOnly && (item.status === 'pending' || item.status === 'approved') && (
                      <>
                        <label className="block text-xs">
                          Motif (obligatoire pour un refus)
                          <input
                            maxLength={500}
                            value={notes[item.id] ?? ''}
                            onChange={(event) => setNotes({ ...notes, [item.id]: event.target.value })}
                            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
                          />
                        </label>
                        {item.status === 'approved' && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="text-xs">
                              Date du paiement effectué
                              <input
                                type="date"
                                max={today}
                                value={dates[item.id] ?? ''}
                                onChange={(event) => setDates({ ...dates, [item.id]: event.target.value })}
                                className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
                              />
                            </label>
                            <label className="text-xs">
                              Référence (obligatoire pour Mobile Money et virement)
                              <input
                                maxLength={150}
                                value={refs[item.id] ?? ''}
                                onChange={(event) => setRefs({ ...refs, [item.id]: event.target.value })}
                                className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
                              />
                            </label>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-4 text-xs">
                          {item.status === 'pending' && (
                            <button
                              disabled={busy}
                              type="button"
                              onClick={() => void decide(item, 'approve')}
                              className="font-semibold text-primary underline"
                            >
                              Approuver
                            </button>
                          )}
                          {item.status === 'approved' && (
                            <button
                              disabled={busy}
                              type="button"
                              onClick={() => void decide(item, 'pay')}
                              className="font-semibold text-primary underline"
                            >
                              Enregistrer le paiement
                            </button>
                          )}
                          <button
                            disabled={busy}
                            type="button"
                            onClick={() => void decide(item, 'reject')}
                            className="text-red-700 underline dark:text-red-300"
                          >
                            Refuser
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                ))
              )}
              {items.length === 500 && (
                <p className="text-xs text-muted-foreground">Les 500 demandes les plus récentes sont affichées.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
