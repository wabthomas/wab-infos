'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Loader2, WalletCards } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { validateRemuneration, type Remuneration } from '@/lib/redaction/rh/remunerations';
import { formatMinorUnits, type RhCurrency } from '@/lib/redaction/rh/money';
import type { Collaborator } from '@/lib/redaction/rh/collaborator';
import type { Balance, Withdrawal } from '@/lib/redaction/rh/withdrawals';

const labels = { draft: 'Brouillon', validated: 'Validé', cancelled: 'Annulé' } as const;
const withdrawalLabels: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  paid: 'Payée',
  rejected: 'Refusée',
  cancelled: 'Annulée',
};

function withdrawalRef(withdrawal: Withdrawal): string {
  return withdrawal.paymentReference?.trim() || `#${withdrawal.id.slice(0, 8).toUpperCase()}`;
}

export function Remunerations({
  enabled,
  withdrawalsEnabled,
  readOnly = false,
  initialMonth,
  initialPersonId,
  initialCurrency,
}: {
  enabled: boolean;
  withdrawalsEnabled: boolean;
  readOnly?: boolean;
  initialMonth: string;
  initialPersonId?: string;
  initialCurrency?: RhCurrency;
}) {
  const [people, setPeople] = useState<Collaborator[]>([]);
  const [person, setPerson] = useState(initialPersonId ?? '');
  const [rows, setRows] = useState<Remuneration[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [month, setMonth] = useState(initialMonth);
  const [currency, setCurrency] = useState<RhCurrency>(initialCurrency ?? 'CDF');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
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
          if (initialPersonId && active.some((entry: Collaborator) => entry.id === initialPersonId)) {
            return initialPersonId;
          }
          return active.some((entry: Collaborator) => entry.id === current) ? current : '';
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Impossible de charger les collaborateurs.');
      });
    return () => controller.abort();
  }, [enabled, reload, initialPersonId]);

  useEffect(() => {
    const refresh = () => setReload((n) => n + 1);
    window.addEventListener('rh-collaborators-changed', refresh);
    return () => window.removeEventListener('rh-collaborators-changed', refresh);
  }, []);

  useEffect(() => {
    setRows([]);
    setBalances([]);
    setWithdrawals([]);
    setFailed(false);
    if (!enabled || !person) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const loadRemunerations = fetchRedaction(
      `/api/redaction/rh/remunerations?${new URLSearchParams({ collaboratorId: person })}`,
      { cache: 'no-store', signal: controller.signal }
    ).then(async (response) => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      setRows(data.remunerations);
    });
    const loadBalance = withdrawalsEnabled
      ? fetchRedaction(`/api/redaction/rh/retraits?${new URLSearchParams({ collaboratorId: person })}`, {
          cache: 'no-store',
          signal: controller.signal,
        }).then(async (response) => {
          if (!response.ok) return;
          const data = await response.json();
          setBalances(data.balances ?? []);
          setWithdrawals(data.withdrawals ?? []);
        })
      : Promise.resolve();

    Promise.all([loadRemunerations, loadBalance])
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailed(true);
          setError('Impossible de charger les rémunérations. Vérifiez la configuration et la migration RH.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled, person, reload, withdrawalsEnabled]);

  async function send(method: 'POST' | 'PATCH', body: unknown) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/remunerations', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Opération impossible.');
      setAmount('');
      setMessage('Opération enregistrée.');
      setReload((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opération impossible.');
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = { collaboratorId: person, month, currency, amount };
    if (!validateRemuneration(raw)) {
      setError('Vérifiez le mois, la devise et le montant.');
      return;
    }
    void send('POST', raw);
  }

  const selected = people.find((entry) => entry.id === person);
  const balance = balances.find((entry) => entry.currency === currency) ?? null;
  const available =
    !balance || balance.available === null
      ? null
      : formatMinorUnits(BigInt(balance.available), currency);
  const latestWithdrawal = withdrawals[0] ?? null;
  const totalsByCurrency = (['CDF', 'USD'] as const).map((code) => ({
    currency: code,
    total: rows
      .filter((row) => row.currency === code && row.status === 'validated')
      .reduce((sum, row) => sum + BigInt(row.amountMinor), BigInt(0)),
  }));

  if (!enabled) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Rémunérations mensuelles</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Suivi désactivé. Activez <code className="rounded bg-muted px-1">REDACTION_RH_FINANCE_ENABLED</code> pour
          l’utiliser.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Rémunérations mensuelles</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Montants saisis et validés manuellement. Aucun calcul de paie ni paiement automatique.
            </p>
          </div>
          <label className="w-full text-sm font-medium sm:w-80">
            Collaborateur
            <select
              disabled={busy}
              value={person}
              onChange={(event) => {
                setPerson(event.target.value);
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
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-300">Solde disponible</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums sm:text-4xl">
                    {loading ? <Loader2 className="h-7 w-7 animate-spin text-zinc-400" /> : available ?? 'Non établi'}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {selected ? `${selected.firstName} ${selected.lastName} · ${selected.jobTitle}` : 'Collaborateur'} ·{' '}
                    {currency}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex rounded-full border border-white/10 bg-white/[0.06] p-1">
                    {(['CDF', 'USD'] as const).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setCurrency(code)}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                          currency === code ? 'bg-white text-[#191923]' : 'text-zinc-300 hover:text-white'
                        }`}
                        aria-pressed={currency === code}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <WalletCards className="h-3.5 w-3.5" />
                    {withdrawalsEnabled ? 'Retraits activés' : 'Retraits désactivés'}
                  </span>
                </div>
              </div>

              {balance && balance.available !== null ? (
                <dl className="mt-5 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                  <div className="rounded-xl bg-white/[0.06] p-3">
                    <dt className="text-zinc-400">Solde initial</dt>
                    <dd className="mt-0.5 font-semibold">
                      {balance.opening === null ? '—' : formatMinorUnits(BigInt(balance.opening), currency)}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-white/[0.06] p-3">
                    <dt className="text-zinc-400">Rémunérations validées</dt>
                    <dd className="mt-0.5 font-semibold">{formatMinorUnits(BigInt(balance.validated), currency)}</dd>
                  </div>
                  <div className="rounded-xl bg-white/[0.06] p-3">
                    <dt className="text-zinc-400">Réservé</dt>
                    <dd className="mt-0.5 font-semibold">{formatMinorUnits(BigInt(balance.reserved), currency)}</dd>
                  </div>
                  <div className="rounded-xl bg-white/[0.06] p-3">
                    <dt className="text-zinc-400">Payé</dt>
                    <dd className="mt-0.5 font-semibold">{formatMinorUnits(BigInt(balance.paid), currency)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-4 rounded-xl bg-amber-400/10 p-3 text-xs leading-5 text-amber-200">
                  Solde initial non établi. Ouvrez les retraits pour l’initialiser après rapprochement des paiements
                  historiques.
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {withdrawalsEnabled ? (
                  <Link
                    href={`/rh/retraits?${new URLSearchParams({
                      collaboratorId: person,
                      currency,
                    }).toString()}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#191923] transition-opacity hover:opacity-90"
                  >
                    Retrait <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
                <Link
                  href={`/rh/retraits?${new URLSearchParams({ collaboratorId: person }).toString()}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-white/40"
                >
                  Toutes les demandes <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                {latestWithdrawal ? (
                  <span className="text-[11px] text-zinc-400">
                    Dernier retrait {withdrawalRef(latestWithdrawal)} ·{' '}
                    {withdrawalLabels[latestWithdrawal.status] ?? latestWithdrawal.status}
                  </span>
                ) : null}
              </div>
            </div>
          </section>

          {totalsByCurrency.some((entry) => entry.total > BigInt(0)) ? (
            <div className="flex flex-wrap gap-2">
              {totalsByCurrency
                .filter((entry) => entry.total > BigInt(0))
                .map((entry) => (
                  <span
                    key={entry.currency}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground"
                  >
                    Total validé {entry.currency} : {formatMinorUnits(entry.total, entry.currency)}
                  </span>
                ))}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-bold">Historique des montants</h3>
              <div className="mt-3 space-y-2">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Chargement…</p>
                ) : failed ? null : rows.length === 0 ? (
                  <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                    Aucune rémunération enregistrée pour ce collaborateur.
                  </p>
                ) : (
                  rows.map((row) => (
                    <article
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-semibold">
                          {row.month} · {formatMinorUnits(BigInt(row.amountMinor), row.currency)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{labels[row.status]}</p>
                      </div>
                      {row.status === 'draft' && !readOnly ? (
                        <div className="flex items-center gap-3 text-xs">
                          <button
                            type="button"
                            disabled={busy}
                            className="font-semibold text-primary underline"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Valider définitivement ${formatMinorUnits(
                                    BigInt(row.amountMinor),
                                    row.currency
                                  )} pour ${row.month} ? Le montant validé ne pourra pas être modifié.`
                                )
                              ) {
                                void send('PATCH', { id: row.id, version: row.version, action: 'validate' });
                              }
                            }}
                          >
                            Valider
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className="text-red-700 underline dark:text-red-300"
                            onClick={() => {
                              if (window.confirm('Annuler ce brouillon ?')) {
                                void send('PATCH', { id: row.id, version: row.version, action: 'cancel' });
                              }
                            }}
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold">{labels[row.status]}</span>
                      )}
                    </article>
                  ))
                )}
                {rows.length === 500 && (
                  <p className="text-xs text-muted-foreground">Les 500 derniers éléments sont affichés.</p>
                )}
              </div>
            </section>

            {!readOnly && <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-5">
              <div>
                <h3 className="text-sm font-bold">Ajouter un montant à vérifier</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Le brouillon devient définitif après validation. Aucune conversion entre devises.
                </p>
              </div>
              <label className="block text-sm font-medium">
                Mois
                <input
                  type="month"
                  min="1900-01"
                  max="9999-12"
                  required
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium">
                Devise
                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value as RhCurrency)}
                  className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
                >
                  <option value="CDF">CDF</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Montant mensuel
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  required
                  maxLength={18}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy ? 'Enregistrement…' : 'Créer le brouillon'}
              </button>
            </form>}
          </div>
        </>
      )}
    </div>
  );
}
