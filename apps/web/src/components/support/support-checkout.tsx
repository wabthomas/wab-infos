'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  HeartHandshake,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import {
  getEnabledMobileMoneyOperators,
  getEnabledSupportMethods,
  type MobileMoneyOperator,
  type SiteSupportSettings,
  type SupportPaymentMethod,
  type SupportPaymentType,
} from '@wab-infos/shared';
import { PaymentQrCode, TetherLogo } from '@/components/support/payment-qr';
import { readReaderAccount } from '@/lib/reader-account';
import { cn } from '@/lib/utils';

const TYPE_META: Record<
  SupportPaymentType,
  { icon: LucideIcon; accent: string; ring: string }
> = {
  mobile_money: {
    icon: Smartphone,
    accent: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    ring: 'border-emerald-500/40 bg-emerald-500/5',
  },
  card: {
    icon: CreditCard,
    accent: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
    ring: 'border-sky-500/40 bg-sky-500/5',
  },
  crypto: {
    icon: HeartHandshake,
    accent: 'bg-[#26A17B]/15 text-[#26A17B]',
    ring: 'border-[#26A17B]/40 bg-[#26A17B]/5',
  },
};

const PRESET_AMOUNTS = [1, 5, 10, 25, 50];

function buildPaymentHref(method: SupportPaymentMethod, amountUsd: number): string | null {
  const url = method.paymentUrl.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has('amount') && amountUsd > 0) {
      parsed.searchParams.set('amount', String(amountUsd));
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function CopyButton({ value, label = 'Copier' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-bold hover:bg-muted"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copié' : label}
    </button>
  );
}

function OperatorPanel({ operator }: { operator: MobileMoneyOperator }) {
  const showNumber =
    operator.displayMode === 'number' || operator.displayMode === 'both';
  const showQr = operator.displayMode === 'qr' || operator.displayMode === 'both';
  const qrValue = operator.number.replace(/\s/g, '');

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-background/80 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-foreground">{operator.label}</h4>
        {showNumber ? <CopyButton value={operator.number} label="Copier le n°" /> : null}
      </div>

      <div
        className={cn(
          'flex flex-col gap-4',
          showNumber && showQr ? 'sm:flex-row sm:items-center sm:justify-between' : ''
        )}
      >
        {showNumber ? (
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Numéro
            </p>
            <p className="break-all font-mono text-lg font-bold tracking-wide text-foreground sm:text-xl">
              {operator.number}
            </p>
          </div>
        ) : null}
        {showQr ? (
          <PaymentQrCode
            value={qrValue}
            size={168}
            label={`Scanner ${operator.label}`}
            className="mx-auto sm:mx-0"
          />
        ) : null}
      </div>
    </div>
  );
}

export function SupportCheckout({ support }: { support: SiteSupportSettings }) {
  const methods = useMemo(() => getEnabledSupportMethods(support), [support]);
  const min = Math.max(1, support.minAmountUsd || 1);
  const [amount, setAmount] = useState(String(min));
  const [selectedId, setSelectedId] = useState(methods[0]?.id ?? '');
  const [operatorId, setOperatorId] = useState('');
  const [hasReaderAccount, setHasReaderAccount] = useState(false);

  useEffect(() => {
    setHasReaderAccount(Boolean(readReaderAccount()));
  }, []);

  const amountNum = Number.parseFloat(amount.replace(',', '.'));
  const amountValid = Number.isFinite(amountNum) && amountNum >= min;
  const selected = methods.find((m) => m.id === selectedId) ?? methods[0] ?? null;
  const paymentHref = selected && amountValid ? buildPaymentHref(selected, amountNum) : null;

  const operators = useMemo(
    () => (selected?.type === 'mobile_money' ? getEnabledMobileMoneyOperators(selected) : []),
    [selected]
  );

  useEffect(() => {
    if (operators.length === 0) {
      setOperatorId('');
      return;
    }
    if (!operators.some((o) => o.id === operatorId)) {
      setOperatorId(operators[0].id);
    }
  }, [operators, operatorId]);

  const selectedOperator =
    operators.find((o) => o.id === operatorId) ?? operators[0] ?? null;

  if (methods.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
        Les moyens de paiement seront bientôt disponibles. Contactez la rédaction si besoin.
      </p>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="rounded-3xl border border-border/80 bg-card/90 p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HeartHandshake className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground">Montant du soutien</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Minimum {min.toFixed(min % 1 === 0 ? 0 : 2)} $ — libre au-delà.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {PRESET_AMOUNTS.filter((v) => v >= min).map((preset) => {
            const active = amountNum === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                className={cn(
                  'h-10 min-w-[3.5rem] rounded-full border px-4 text-sm font-bold transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:bg-muted'
                )}
              >
                {preset} $
              </button>
            );
          })}
        </div>

        <label className="mt-4 flex items-center gap-2">
          <span className="text-lg font-bold text-muted-foreground">$</span>
          <input
            type="number"
            min={min}
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-12 w-full max-w-[11rem] rounded-2xl border border-border bg-background px-4 text-lg font-bold tabular-nums outline-none ring-primary/30 focus:ring-2"
          />
        </label>
        {!amountValid ? (
          <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
            Indiquez un montant d’au moins {min} $.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Moyen de paiement
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {methods.map((method) => {
            const meta = TYPE_META[method.type];
            const Icon = meta.icon;
            const active = selected?.id === method.id;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelectedId(method.id)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-all sm:flex-col sm:items-start sm:gap-3',
                  active
                    ? cn(meta.ring, 'ring-1 ring-inset')
                    : 'border-border bg-card hover:bg-muted/40'
                )}
              >
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', meta.accent)}>
                  {method.type === 'crypto' ? (
                    <TetherLogo className="h-6 w-6" />
                  ) : (
                    <Icon className="h-4 w-4" aria-hidden />
                  )}
                </span>
                <span className="text-sm font-bold text-foreground">{method.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {selected ? (
        <section className="space-y-5 rounded-3xl border border-border/80 bg-card/90 p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 sm:p-6">
          <div>
            <h3 className="text-lg font-bold text-foreground">{selected.label}</h3>
            {selected.instructions ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {selected.instructions}
              </p>
            ) : null}
            {amountValid ? (
              <p className="mt-2 text-sm font-semibold text-foreground">
                À envoyer : <span className="tabular-nums">{amountNum} $</span>
              </p>
            ) : null}
          </div>

          {selected.type === 'mobile_money' ? (
            operators.length === 0 ? (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Aucun opérateur Mobile Money n’est encore configuré.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {operators.map((op) => {
                    const active = selectedOperator?.id === op.id;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setOperatorId(op.id)}
                        className={cn(
                          'h-10 rounded-full border px-4 text-sm font-bold transition-colors',
                          active
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-border bg-background hover:bg-muted'
                        )}
                      >
                        {op.label}
                      </button>
                    );
                  })}
                </div>
                {selectedOperator ? <OperatorPanel operator={selectedOperator} /> : null}
              </div>
            )
          ) : null}

          {selected.type === 'crypto' ? (
            selected.account ? (
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Adresse USDT
                  </p>
                  <code className="block break-all rounded-2xl bg-muted px-4 py-3 text-sm font-semibold text-foreground">
                    {selected.account}
                  </code>
                  <CopyButton value={selected.account} label="Copier l’adresse" />
                </div>
                <PaymentQrCode
                  value={selected.account}
                  size={200}
                  centerLogo="tether"
                  label="Scanner pour payer en USDT"
                />
              </div>
            ) : (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Adresse crypto non configurée.
              </p>
            )
          ) : null}

          {selected.type === 'card' ? (
            paymentHref ? (
              <a
                href={paymentHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90 sm:w-auto',
                  !amountValid && 'pointer-events-none opacity-50'
                )}
              >
                Payer {amountValid ? `${amountNum} $` : ''} par carte
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            ) : (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Lien de paiement carte non configuré.
              </p>
            )
          ) : null}

          {!hasReaderAccount ? (
            <p className="border-t border-border pt-4 text-sm text-muted-foreground">
              Astuce :{' '}
              <Link
                href="/connexion"
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                connectez votre compte lecteur
              </Link>{' '}
              pour associer votre e-mail au soutien.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
