'use client';
import { useRhNotice } from './use-rh-notice';

import { useEffect, useState } from 'react';
import { MOBILE_MONEY_PROVIDERS as logoProviders } from '@/lib/redaction/rh/payouts';
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
  const [error, setError] = useRhNotice('error');
  const [message, setMessage] = useRhNotice('success');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [logos, setLogos] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    void Promise.all(logoProviders.map(async (entry) => {
      const res = await fetchRedaction(`/api/redaction/rh/organisation/assets/payout-logo-${entry.value}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      return data.asset ? [entry.value, data.asset] as const : null;
    })).then((entries) => { if (active) setLogos(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry !== null))); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

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
  useEffect(() => {
    const open = () => setPanelOpen(true);
    window.addEventListener('rh-open-payouts', open);
    return () => window.removeEventListener('rh-open-payouts', open);
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
      <div className={`${panelOpen ? 'fixed inset-0 z-[80] flex items-end bg-black/60' : 'hidden'} sm:static sm:block sm:bg-transparent`} onMouseDown={(event) => { if (event.target === event.currentTarget && !formOpen) setPanelOpen(false); }}>
      <section role={panelOpen ? 'dialog' : undefined} aria-modal={panelOpen || undefined} aria-label={panelOpen ? 'Moyens de paiement' : undefined} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-h-none sm:rounded-2xl sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Moyens de paiement</h2>
          <button type="button" aria-haspopup="dialog" aria-expanded={formOpen} onClick={() => setFormOpen(true)} className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">+ Ajouter un moyen</button>
        </div>
        <button type="button" onClick={() => setPanelOpen(false)} className="mt-2 text-xs font-semibold text-muted-foreground underline sm:hidden">Fermer les moyens</button>
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
                    {method.kind === 'mobile_money' && logos[method.provider] ? <img src={logos[method.provider]} alt="" className="h-full w-full rounded-lg object-contain" /> : providerShort(method.kind, method.provider)}
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
      </section></div>

      {formOpen && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setFormOpen(false); }}>
        <form role="dialog" aria-modal="true" aria-labelledby="add-payout-title" onSubmit={add} className="max-h-[92dvh] w-full max-w-lg space-y-3 overflow-y-auto rounded-t-2xl border border-border bg-card p-5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3"><h3 id="add-payout-title" className="text-sm font-bold">Ajouter un moyen de paiement</h3><button type="button" disabled={busy} onClick={() => setFormOpen(false)} aria-label="Fermer" className="rounded-full border border-border px-3 py-1 text-xs">Fermer</button></div>
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
        </form></div>}
    </div>
  );
}
