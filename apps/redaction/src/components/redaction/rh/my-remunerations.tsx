'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Loader2, WalletCards } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { formatMinorUnits, type RhCurrency } from '@/lib/redaction/rh/money';
import type { Remuneration } from '@/lib/redaction/rh/remunerations';
import type { Balance, Withdrawal } from '@/lib/redaction/rh/withdrawals';

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

export function MyRemunerations({
  enabled = true,
  withdrawalsEnabled = false,
  initialCurrency,
}: {
  enabled?: boolean;
  withdrawalsEnabled?: boolean;
  initialCurrency?: RhCurrency;
} = {}) {
  const [rows, setRows] = useState<Remuneration[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [currency, setCurrency] = useState<RhCurrency>(initialCurrency ?? 'USD');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const loadRemunerations = fetchRedaction('/api/redaction/rh/mon-espace/remunerations', {
      cache: 'no-store',
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      setRows(data.remunerations ?? []);
    });
    const loadBalance = withdrawalsEnabled
      ? fetchRedaction('/api/redaction/rh/mon-espace/retraits', {
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
        if (!controller.signal.aborted) setError('Impossible de charger vos rémunérations.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled, withdrawalsEnabled]);

  const balance = balances.find((entry) => entry.currency === currency) ?? null;
  const available =
    !balance || balance.available === null ? null : formatMinorUnits(BigInt(balance.available), currency);
  const latest = withdrawals[0] ?? null;
  const totals = (['CDF', 'USD'] as const).map((code) => ({
    currency: code,
    total: rows
      .filter((row) => row.currency === code)
      .reduce((sum, row) => sum + BigInt(row.amountMinor), BigInt(0)),
  }));

  if (!enabled) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Mes rémunérations</h2>
        <p className="mt-2 text-sm text-muted-foreground">Le suivi des rémunérations est désactivé.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl bg-[#191923] p-5 text-white shadow-sm sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-20 h-52 w-52 rounded-full border border-white/[0.07] bg-white/[0.03]" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-300">Mon solde disponible</p>
              <p className="mt-1 text-3xl font-bold tabular-nums sm:text-4xl">
                {loading ? <Loader2 className="h-7 w-7 animate-spin text-zinc-400" /> : available ?? 'Non établi'}
              </p>
              <WalletCards className="sr-only" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex rounded-full border border-white/10 bg-white/[0.06] p-1">
                {(['USD', 'CDF'] as const).map((code) => (
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
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {withdrawalsEnabled ? (
              <Link
                href={`/mon-rh/retraits?${new URLSearchParams({ currency }).toString()}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#191923] transition-opacity hover:opacity-90"
              >
                Demander un retrait <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            ) : null}
            <Link
              href="/mon-rh/retraits"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-white/40"
            >
              Mes retraits <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            {latest ? (
              <span className="text-[11px] text-zinc-400">
                Dernier retrait {withdrawalRef(latest)} · {withdrawalLabels[latest.status] ?? latest.status}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {totals.some((entry) => entry.total > BigInt(0)) ? (
        <div className="flex flex-wrap gap-2">
          {totals
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

      <section className="rounded-2xl border border-border bg-card p-5">
        <div>
          <h2 className="font-display text-lg font-bold">Mes rémunérations validées</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Montants validés par l’administration, mois par mois. Aucun calcul de paie automatique.
          </p>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : rows.length === 0 ? (
            <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">Aucun montant validé.</p>
          ) : (
            rows.map((row) => (
              <article
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5 text-sm"
              >
                <div>
                  <p className="font-semibold">{row.month}</p>
                  <p className="text-[11px] text-muted-foreground">Rémunération validée</p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  {formatMinorUnits(BigInt(row.amountMinor), row.currency)}
                </span>
              </article>
            ))
          )}
          {rows.length === 500 && (
            <p className="text-xs text-muted-foreground">Les 500 derniers éléments sont affichés.</p>
          )}
        </div>
      </section>
    </div>
  );
}
