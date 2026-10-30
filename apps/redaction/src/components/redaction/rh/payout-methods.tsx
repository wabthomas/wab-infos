'use client';

import { useEffect, useState } from 'react';
import { PlusCircle, ShieldCheck } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import {
  MOBILE_MONEY_PROVIDERS,
  BANK_PROVIDERS,
  maskAccount,
  providerColor,
  providerLabel,
  providerShort,
  providersFor,
  type PayoutKind,
  type PayoutMethod,
} from '@/lib/redaction/rh/payouts';
import type { RhCurrency } from '@/lib/redaction/rh/money';

type Preference = { currency: RhCurrency; enabled: boolean };

export function PayoutMethods() {
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [kind, setKind] = useState<PayoutKind>('mobile_money');
  const [provider, setProvider] = useState('airtel');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [currency, setCurrency] = useState<RhCurrency>('CDF');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [m, p] = await Promise.all([
        fetchRedaction('/api/redaction/rh/mon-espace/moyens', { cache: 'no-store' }),
        fetchRedaction('/api/redaction/rh/mon-espace/devises', { cache: 'no-store' }),
      ]);
      if (m.ok) setMethods((await m.json()).methods ?? []);
      if (p.ok) setPreferences((await p.json()).preferences ?? []);
    } catch {
      setError('Impossible de charger vos moyens de retrait.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener('rh-payouts-changed', refresh);
    return () => window.removeEventListener('rh-payouts-changed', refresh);
  }, []);

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/mon-espace/moyens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, provider, accountName, accountNumber, currency }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ajout impossible.');
      setAccountName('');
      setAccountNumber('');
      setMessage('Moyen de retrait ajouté.');
      setFormOpen(false);
      await load();
      window.dispatchEvent(new Event('rh-payouts-changed'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ajout impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(method: PayoutMethod) {
    setBusy(true);
    setError('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/mon-espace/moyens', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: method.id, active: !method.active, version: method.version }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Modification impossible.');
      await load();
      window.dispatchEvent(new Event('rh-payouts-changed'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Modification impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleCurrency(currency: RhCurrency, enabled: boolean) {
    setBusy(true);
    try {
      const response = await fetchRedaction('/api/redaction/rh/mon-espace/devises', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency, enabled }),
      });
      if (!response.ok) throw new Error();
      setPreferences((current) => current.map((entry) => (entry.currency === currency ? { ...entry, enabled } : entry)));
    } catch {
      setError('Impossible de modifier la devise.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div>
          <h2 className="font-display text-lg font-bold">Mes moyens de retrait</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mobile Money ou compte bancaire. Les coordonnées servent uniquement à l’administration pour le paiement.
          </p>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        {message && <p role="status" className="mt-3 text-sm text-primary">{message}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {preferences.map((entry) => (
            <button
              key={entry.currency}
              type="button"
              disabled={busy}
              onClick={() => void toggleCurrency(entry.currency, !entry.enabled)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                entry.enabled
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-background text-muted-foreground'
              }`}
            >
              {entry.currency} {entry.enabled ? 'activée' : 'désactivée'}
            </button>
          ))}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Les numéros sont masqués à l’affichage
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : methods.length === 0 ? (
            <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
              Aucun moyen enregistré. Ajoutez-en un ci-dessous.
            </p>
          ) : (
            methods.map((method) => (
              <div
                key={method.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                    style={{ backgroundColor: providerColor(method.kind, method.provider) }}
                  >
                    {providerShort(method.kind, method.provider)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      {providerLabel(method.kind, method.provider)} · {method.currency}
                      {method.isDefault ? ' · par défaut' : ''}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {method.accountName} · {maskAccount(method.accountNumber)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggle(method)}
                  className="text-xs font-semibold text-primary underline"
                >
                  {method.active ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-3">
        <button type="button" aria-expanded={formOpen} onClick={() => setFormOpen((open) => !open)} className="w-full rounded-xl border border-dashed border-primary/40 bg-card px-4 py-3 text-left text-sm font-semibold text-primary hover:bg-primary/[0.04]">
          {formOpen ? '− Fermer' : '+ Ajouter un moyen'}
        </button>
        {formOpen && <form onSubmit={add} className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold">Ajouter un moyen</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Type
            <select
              value={kind}
              onChange={(event) => {
                const next = event.target.value as PayoutKind;
                setKind(next);
                setProvider(next === 'bank' ? BANK_PROVIDERS[0].value : MOBILE_MONEY_PROVIDERS[0].value);
              }}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
            >
              <option value="mobile_money">Mobile Money</option>
              <option value="bank">Compte bancaire</option>
            </select>
          </label>
          <label className="text-sm">
            Opérateur / banque
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
            >
              {providersFor(kind).map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Nom du titulaire
            <input
              required
              maxLength={120}
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Numéro / compte
            <input
              required
              maxLength={60}
              inputMode={kind === 'mobile_money' ? 'tel' : 'text'}
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Devise
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as RhCurrency)}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
            >
              {(['CDF', 'USD'] as const)
                .filter((code) => preferences.find((entry) => entry.currency === code)?.enabled !== false)
                .map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <PlusCircle className="h-4 w-4" /> Ajouter
        </button>
        </form>}
      </section>
    </div>
  );
}
