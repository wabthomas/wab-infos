'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowDownUp, CheckCircle2, Clock3, Loader2, PlusCircle, WalletCards } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { formatMinorUnits, type RhCurrency } from '@/lib/redaction/rh/money';
import {
  validateWithdrawal,
  type Balance,
  type Withdrawal,
  type WithdrawalMethod,
} from '@/lib/redaction/rh/withdrawals';
import type { PayoutMethod } from '@/lib/redaction/rh/payouts';

const endpoint = '/api/redaction/rh/mon-espace/retraits';
const statuses = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Refusée',
  cancelled: 'Annulée',
  paid: 'Payée',
} as const;
const statusTones: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  approved: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  paid: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  rejected: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  cancelled: 'bg-muted text-muted-foreground',
};
const methodsList = {
  mobile_money: 'Mobile Money',
  virement: 'Virement',
  especes: 'Espèces',
  autre: 'Autre',
} as const;

type WithdrawalFilter = 'all' | 'pending' | 'settled' | 'cancelled';
const historyFilters: ReadonlyArray<{ value: WithdrawalFilter; label: string; statuses: readonly string[] }> = [
  { value: 'all', label: 'Toutes', statuses: [] },
  { value: 'pending', label: 'En attente', statuses: ['pending'] },
  { value: 'settled', label: 'Validées-payées', statuses: ['approved', 'paid'] },
  { value: 'cancelled', label: 'Annulées-refusées', statuses: ['rejected', 'cancelled'] },
];

function withdrawalRef(withdrawal: Withdrawal): string {
  return withdrawal.paymentReference?.trim() || `#${withdrawal.id.slice(0, 8).toUpperCase()}`;
}

export function MyWithdrawals({
  enabled = true,
  initialCurrency,
}: {
  enabled?: boolean;
  initialCurrency?: RhCurrency;
} = {}) {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [payoutMethodId, setPayoutMethodId] = useState('');
  const [currency, setCurrency] = useState<RhCurrency>(initialCurrency ?? 'CDF');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawalMethod>('mobile_money');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<WithdrawalFilter>('all');
  const key = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    setError('');
    fetchRedaction(endpoint, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        setBalances(data.balances ?? []);
        setItems(data.withdrawals ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailed(true);
          setError('Impossible de charger vos soldes et retraits.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    fetchRedaction('/api/redaction/rh/mon-espace/moyens', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (response.ok) setMethods((await response.json()).methods ?? []);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [enabled, reload]);

  async function send(methodName: 'POST' | 'PATCH', body: unknown) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetchRedaction(endpoint, {
        method: methodName,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Opération impossible.');
      if (methodName === 'POST') {
        key.current = null;
        setAmount('');
      }
      setMessage(methodName === 'POST' ? 'Demande enregistrée.' : 'Demande annulée.');
      setReload((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opération impossible.');
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    key.current ??= crypto.randomUUID();
    const payload = { key: key.current, currency, amount, method, ...(payoutMethodId ? { payoutMethodId } : {}) };
    if (!validateWithdrawal(payload)) {
      setError('Vérifiez le montant et la devise.');
      return;
    }
    void send('POST', payload);
  }

  if (!enabled) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Mes soldes et retraits</h2>
        <p className="mt-2 text-sm text-muted-foreground">Les retraits sont désactivés.</p>
      </section>
    );
  }

  const balance = balances.find((entry) => entry.currency === currency) ?? null;
  const available =
    !balance || balance.available === null ? null : formatMinorUnits(BigInt(balance.available), currency);
  const pendingCount = items.filter((item) => item.status === 'pending').length;
  const approvedCount = items.filter((item) => item.status === 'approved').length;
  const paidCount = items.filter((item) => item.status === 'paid').length;
  const closedCount = items.filter((item) => item.status === 'rejected' || item.status === 'cancelled').length;
  const filterCounts: Record<WithdrawalFilter, number> = {
    all: items.length,
    pending: pendingCount,
    settled: approvedCount + paidCount,
    cancelled: closedCount,
  };
  const activeFilter = historyFilters.find((entry) => entry.value === filter) ?? historyFilters[0];
  const visibleItems =
    filter === 'all' ? items : items.filter((item) => activeFilter.statuses.includes(item.status));

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl bg-[#191923] p-5 text-white shadow-sm sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-20 h-52 w-52 rounded-full border border-white/[0.07] bg-white/[0.03]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-300">Mon solde disponible</p>
            <p className="mt-1 text-3xl font-bold tabular-nums sm:text-4xl">
              {loading ? <Loader2 className="h-7 w-7 animate-spin text-zinc-400" /> : available ?? 'Non établi'}
            </p>
            <p className="mt-1 text-xs text-zinc-400">{currency} · montants validés, réservés et payés déduits</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex rounded-full border border-white/10 bg-white/[0.06] p-1">
              {(['CDF', 'USD'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setCurrency(code);
                    key.current = null;
                  }}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                    currency === code ? 'bg-white text-[#191923]' : 'text-zinc-300 hover:text-white'
                  }`}
                  aria-pressed={currency === code}
                >
                  {code}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap justify-end gap-2 text-[11px]">
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
                {balance.opening === null ? '—' : formatMinorUnits(BigInt(balance.opening), currency)}
              </dd>
            </div>
            <div className="rounded-xl bg-white/[0.06] p-3">
              <dt className="text-zinc-400">Rémunérations</dt>
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
            Votre solde initial doit être établi par l’administrateur avant toute demande de retrait.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <a
            href="#nouvelle-demande"
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-opacity ${
              available === null
                ? 'cursor-not-allowed bg-white/20 text-white/60'
                : 'bg-white text-[#191923] hover:opacity-90'
            }`}
            aria-disabled={available === null}
          >
            <PlusCircle className="h-3.5 w-3.5" /> Nouvelle demande
          </a>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
            <WalletCards className="h-3.5 w-3.5" /> Aucun transfert automatique
          </span>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      {message && <p role="status" className="text-sm text-primary">{message}</p>}

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Mes demandes de retrait</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Chaque demande porte un numéro de suivi. Le paiement est enregistré par l’administration.
            </p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
            {items.length}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer l’historique des retraits">
          {historyFilters.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                filter === value
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {label} ({filterCounts[value]})
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : failed ? null : items.length === 0 ? (
            <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">Aucune demande de retrait.</p>
          ) : visibleItems.length === 0 ? (
            <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">Aucune demande dans ce filtre.</p>
          ) : (
            visibleItems.map((item) => (
              <article key={item.id} className="rounded-xl border border-border p-3.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      Retrait {withdrawalRef(item)} · {formatMinorUnits(BigInt(item.amountMinor), item.currency)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {methodsList[item.method]}
                      {item.payoutLabel ? ` · ${item.payoutLabel}` : ''}
                      {item.paymentDate ? ` · payé le ${item.paymentDate}` : ''}
                      {item.paymentReference ? ` · référence : ${item.paymentReference}` : ''}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      statusTones[item.status] ?? 'bg-muted'
                    }`}
                  >
                    {statuses[item.status]}
                  </span>
                </div>
                {item.decisionNote && (
                  <p className="mt-1 text-[11px] text-muted-foreground">Motif : {item.decisionNote}</p>
                )}
                {item.status === 'pending' && (
                  <button
                    type="button"
                    disabled={busy}
                    className="mt-2 text-xs font-semibold text-red-700 underline dark:text-red-300"
                    onClick={() => {
                      if (window.confirm('Annuler cette demande ?')) {
                        void send('PATCH', { action: 'cancel', id: item.id, version: item.version });
                      }
                    }}
                  >
                    Annuler ma demande
                  </button>
                )}
                {item.status === 'paid' && (
                  <Link
                    href={`/mon-rh/recu/${item.id}`}
                    className="mt-2 inline-flex text-xs font-semibold text-primary underline"
                  >
                    Télécharger le reçu
                  </Link>
                )}
              </article>
            ))
          )}
          {items.length === 500 && (
            <p className="text-xs text-muted-foreground">Les 500 demandes les plus récentes sont affichées.</p>
          )}
        </div>
      </section>

      <form
        id="nouvelle-demande"
        onSubmit={submit}
        className="scroll-mt-24 space-y-3 rounded-2xl border border-border bg-card p-5"
      >
        <div>
          <h2 className="font-display text-lg font-bold">Demander un retrait</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Un solde initial doit être établi par l’administrateur. Ne saisissez pas vos coordonnées bancaires ou Mobile
            Money ici.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Montant
            <input
              required
              value={amount}
              disabled={busy}
              inputMode="decimal"
              maxLength={18}
              onChange={(event) => {
                setAmount(event.target.value);
                key.current = null;
              }}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Devise
            <select
              disabled={busy}
              value={currency}
              onChange={(event) => {
                setCurrency(event.target.value as RhCurrency);
                setPayoutMethodId('');
                key.current = null;
              }}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
            >
              <option value="CDF">CDF</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label className="text-sm">
            Moyen
            <select
              disabled={busy}
              value={method}
              onChange={(event) => {
                setMethod(event.target.value as WithdrawalMethod);
                key.current = null;
              }}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
            >
              {Object.entries(methodsList).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Destination (moyen enregistré)
            <select
              disabled={busy}
              value={payoutMethodId}
              onChange={(event) => {
                setPayoutMethodId(event.target.value);
                key.current = null;
              }}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
            >
              <option value="">Non précisée</option>
              {methods
                .filter((entry) => entry.active && entry.currency === currency)
                .map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.provider} · {entry.accountName} · {entry.accountNumber.slice(-4).padStart(4, '•')}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={busy || available === null}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? 'Envoi…' : 'Envoyer la demande'}
        </button>
      </form>
    </div>
  );
}
