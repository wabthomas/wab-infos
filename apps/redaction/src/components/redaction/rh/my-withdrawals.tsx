'use client';
import { useRhNotice } from './use-rh-notice';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowDownUp, Banknote, CheckCircle2, Clock3, Landmark, Loader2, PlusCircle, Smartphone, Wallet, X, Send } from 'lucide-react';
import { MyPaymentHistory } from './my-payment-history';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { formatMinorUnits, type RhCurrency } from '@/lib/redaction/rh/money';
import { repairLegacyMojibake } from '@/lib/redaction/rh/repair-text';
import {
  validateWithdrawal,
  payoutKindForWithdrawal,
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
const methodIcons = { mobile_money: Smartphone, virement: Landmark, especes: Banknote, autre: Wallet } as const;

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
  const [currency, setCurrency] = useState<RhCurrency>(initialCurrency ?? 'USD');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawalMethod>('mobile_money');
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [submitted, setSubmitted] = useState<Withdrawal | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useRhNotice('error');
  const [message, setMessage] = useRhNotice('success');
  const [filter, setFilter] = useState<WithdrawalFilter>('all');
  const key = useRef<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const [viewport, setViewport] = useState({ top: '0px', height: '100dvh' });
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!requestOpen && !submitted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => (requestOpen ? closeRef.current : document.getElementById('withdrawal-success-close'))?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) { event.preventDefault(); setRequestOpen(false); setSubmitted(null); }
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector<HTMLElement>('#withdrawal-request-dialog, #withdrawal-success-dialog');
      const focusable = dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)');
      if (!focusable?.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!dialog?.contains(document.activeElement)) { event.preventDefault(); first.focus(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', keydown);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('keydown', keydown); document.body.style.overflow = previous; requestAnimationFrame(() => triggerRef.current?.focus()); };
  }, [requestOpen, submitted]);
  useEffect(() => {
    if (!requestOpen && !submitted) return;
    const visual = window.visualViewport;
    if (!visual) return;
    const resize = () => {
      setViewport({top: `${Math.max(0, visual.offsetTop)}px`, height: `${Math.max(120, visual.height)}px`});
      requestAnimationFrame(() => {
        const content = contentRef.current, focused = document.activeElement;
        if (!content || !(focused instanceof HTMLElement) || !content.contains(focused)) return;
        const field = focused.getBoundingClientRect(), bounds = content.getBoundingClientRect();
        if (field.bottom > bounds.bottom - 12) content.scrollTop += field.bottom - bounds.bottom + 12;
      });
    };
    resize();
    visual.addEventListener('resize', resize);
    visual.addEventListener('scroll', resize);
    return () => { visual.removeEventListener('resize', resize); visual.removeEventListener('scroll', resize); };
  }, [requestOpen, submitted]);

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
        setRequestOpen(false);
        setSubmitted(data.withdrawal as Withdrawal);
      }
      setMessage(methodName === 'POST' ? 'Demande envoyée, en attente de traitement.' : 'Demande annulée.');
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
    if (payoutMethodId && !methods.some(entry => entry.id === payoutMethodId && entry.active && entry.currency === currency && entry.kind === payoutKindForWithdrawal(method))) {
      setError('La destination sélectionnée ne correspond pas au moyen de paiement.');
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
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex rounded-full border border-white/10 bg-white/[0.06] p-1">
              {(['USD', 'CDF'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setCurrency(code);
                    setPayoutMethodId('');
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
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            ref={triggerRef}
            onClick={() => { setError(''); setRequestOpen(open => !open); }}
            disabled={available === null}
            aria-expanded={requestOpen}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${available === null ? 'bg-white/20 text-white/60' : 'bg-white text-[#191923] hover:opacity-90'}`}
          >
            <PlusCircle className="h-3.5 w-3.5" /> {requestOpen ? 'Fermer' : 'Nouvelle demande'}
          </button>
        </div>
      </section>

      {error && !requestOpen && (
        <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      {message && <p role="status" className="text-sm text-primary">{message}</p>}

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Mes demandes de retrait</h2>
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
                      {item.payoutLabel ? ` · ${repairLegacyMojibake(item.payoutLabel)}` : ''}
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
                  <p className="mt-1 text-[11px] text-muted-foreground">Motif : {repairLegacyMojibake(item.decisionNote)}</p>
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

      <MyPaymentHistory refresh={reload} />
      <Link href="/mon-rh/paiements-anciens" className="block rounded-xl border border-border bg-card p-4 text-sm font-semibold text-primary underline">Déclarer un paiement ancien</Link>

      {submitted && mounted && createPortal(<div style={{ '--rh-viewport-top': viewport.top, '--rh-viewport-height': viewport.height } as React.CSSProperties} className="fixed inset-x-0 top-[var(--rh-viewport-top)] z-[150] flex h-[var(--rh-viewport-height)] items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) setSubmitted(null); }}>
        <section id="withdrawal-success-dialog" role="dialog" aria-modal="true" aria-labelledby="withdrawal-success-title" aria-describedby="withdrawal-success-description" onKeyDown={event => { if (event.key === 'Escape') setSubmitted(null); }} className="relative w-full max-w-md rounded-t-3xl border border-border bg-card p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center shadow-2xl sm:rounded-3xl sm:p-8">
          <button id="withdrawal-success-close" type="button" aria-label="Fermer" onClick={() => setSubmitted(null)} className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
          <div className="relative mx-auto mb-5 grid h-24 w-24 place-items-center rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
            <span className="absolute inset-1 rounded-full border-2 border-dashed border-amber-500/45 motion-safe:animate-spin motion-reduce:animate-none" aria-hidden="true" />
            <Clock3 className="h-11 w-11" aria-hidden="true" />
          </div>
          <h2 id="withdrawal-success-title" className="font-display text-xl font-bold">Demande de retrait envoyée</h2>
          <p id="withdrawal-success-description" className="mt-3 text-sm leading-6 text-muted-foreground">Votre demande de {formatMinorUnits(BigInt(submitted.amountMinor), submitted.currency)} a bien été enregistrée. Elle est en attente de vérification puis de paiement par l’administration.</p>
          <p className="mt-4 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-900 dark:text-amber-300">En attente de paiement · aucun versement n’a encore été effectué.</p>
          <p className="mt-2 text-xs text-muted-foreground">Suivi : {withdrawalRef(submitted)}</p>
          <button type="button" autoFocus onClick={() => setSubmitted(null)} className="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">Voir mes demandes</button>
        </section>
      </div>, document.body)}

      {requestOpen && mounted && createPortal(<div style={{ '--rh-viewport-top': viewport.top, '--rh-viewport-height': viewport.height } as React.CSSProperties} className="fixed inset-x-0 top-[var(--rh-viewport-top)] z-[150] flex h-[var(--rh-viewport-height)] items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setRequestOpen(false); }}>
        <form role="dialog" aria-modal="true" aria-labelledby="withdrawal-request-title" id="withdrawal-request-dialog"
          onSubmit={submit} onKeyDown={event => { if (event.key === 'Escape' && !busy) setRequestOpen(false); }}
          className="flex max-h-full w-full max-w-lg min-h-0 flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:max-h-[calc(100%-2rem)] sm:rounded-3xl"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-5 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Wallet className="h-6 w-6" aria-hidden="true" /></span><div className="min-w-0"><h2 id="withdrawal-request-title" className="font-display text-lg font-bold">Nouveau retrait</h2><p className="truncate text-xs text-muted-foreground">Disponible : {available ?? '—'}</p></div></div>
            <button ref={closeRef} type="button" disabled={busy} aria-label="Fermer le formulaire" onClick={() => setRequestOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border text-foreground hover:bg-muted disabled:opacity-50"><X className="h-5 w-5" aria-hidden="true" /></button>
          </div>
          <div ref={contentRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <label className="min-w-0 text-sm font-semibold">Montant
                <input required value={amount} disabled={busy} inputMode="decimal" maxLength={18}
                  onChange={event => { setAmount(event.target.value); key.current = null; }}
                  className="mt-2 block min-h-12 w-full rounded-xl border border-border bg-background px-3 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-primary" placeholder="0,00" />
              </label>
              <label className="min-w-0 text-sm font-semibold">Devise
                <select disabled={busy} value={currency} onChange={event => { setCurrency(event.target.value as RhCurrency); setPayoutMethodId(''); key.current = null; }}
                  className="mt-2 block min-h-12 w-full rounded-xl border border-border bg-background px-3 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <option value="CDF">CDF</option><option value="USD">USD</option>
                </select>
              </label>
              <fieldset className="min-w-0 sm:col-span-2">
                <legend className="text-sm font-semibold">Moyen de paiement</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(Object.entries(methodsList) as [WithdrawalMethod, string][]).map(([value, label]) => {
                    const Icon = methodIcons[value];
                    return <button key={value} type="button" disabled={busy} aria-pressed={method === value}
                      onClick={() => { setMethod(value); setPayoutMethodId(''); key.current = null; }}
                      className={`flex min-h-14 min-w-0 items-center gap-2 rounded-xl border px-3 text-left text-sm font-semibold transition-colors disabled:opacity-50 ${method === value ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30' : 'border-border bg-background text-foreground hover:bg-muted'}`}>
                      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{label}</span>
                    </button>;
                  })}
                </div>
              </fieldset>
              {payoutKindForWithdrawal(method) && <label className="min-w-0 text-sm font-semibold sm:col-span-2">Destination
                <select disabled={busy} value={payoutMethodId} onChange={event => { setPayoutMethodId(event.target.value); key.current = null; }}
                  className="mt-2 block min-h-12 w-full rounded-xl border border-border bg-background px-3 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <option value="">Non précisée</option>
                  {methods.filter(entry => entry.active && entry.currency === currency && entry.kind === payoutKindForWithdrawal(method)).map(entry =>
                    <option key={entry.id} value={entry.id}>{repairLegacyMojibake(entry.provider)} · {repairLegacyMojibake(entry.accountName)} · {entry.accountNumber.slice(-4).padStart(4, '•')}</option>)}
                </select>
              </label>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row-reverse sm:px-6">
            <button type="submit" disabled={busy || available === null} className="inline-flex min-h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50 sm:w-auto">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4 shrink-0" aria-hidden="true" />}
              <span>{busy ? 'Envoi…' : 'Envoyer la demande'}</span>
            </button>
            <button type="button" disabled={busy} onClick={() => setRequestOpen(false)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50 sm:w-auto">
              <X className="h-4 w-4 shrink-0" aria-hidden="true" /><span>Annuler</span>
            </button>
          </div>
        </form>
      </div>, document.body)}
    </div>
  );
}
