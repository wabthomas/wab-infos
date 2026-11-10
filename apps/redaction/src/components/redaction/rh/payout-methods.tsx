'use client';
import { useRhNotice } from './use-rh-notice';

import { useEffect, useState } from 'react';
import { MOBILE_MONEY_PROVIDERS as logoProviders } from '@/lib/redaction/rh/payouts';
import { Landmark, PlusCircle, WalletCards, X, Loader2 } from 'lucide-react';
import { RhFormModal } from './rh-form-modal';
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
    const openPanel = () => setPanelOpen(true);
    window.addEventListener('rh-open-payout-methods', openPanel);
    void load();
    const refresh = () => void load();
    window.addEventListener('rh-payouts-changed', refresh);
    return () => { window.removeEventListener('rh-payouts-changed', refresh); window.removeEventListener('rh-open-payout-methods', openPanel); };
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
    <>
      <RhFormModal open={panelOpen && !formOpen} busy={busy} onClose={() => setPanelOpen(false)} width="max-w-2xl">
      <section role="dialog" aria-modal="true" aria-labelledby="payout-methods-title" className="min-h-0 w-full overflow-y-auto overscroll-contain p-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id="payout-methods-title" className="flex items-center gap-2 font-display text-lg font-bold"><WalletCards className="h-5 w-5 text-primary" aria-hidden="true" /> Moyen de paiement</h2>
          <button type="button" aria-label="Fermer les moyens de paiement" onClick={() => setPanelOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <button type="button" aria-haspopup="dialog" aria-expanded={formOpen} onClick={() => setFormOpen(true)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"><PlusCircle className="h-4 w-4" /> Ajouter un moyen</button>
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
      </section>
      </RhFormModal>

      <RhFormModal open={formOpen} busy={busy} onClose={() => setFormOpen(false)}>
        <form role="dialog" aria-modal="true" aria-labelledby="add-payout-title" onSubmit={add} className="flex min-h-0 w-full flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border p-5 sm:px-6"><h3 id="add-payout-title" className="flex items-center gap-2 font-display text-lg font-bold"><Landmark className="h-5 w-5 text-primary" /> Ajouter un moyen</h3><button type="button" disabled={busy} onClick={() => setFormOpen(false)} aria-label="Fermer" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border hover:bg-muted"><X className="h-5 w-5" /></button></header>
        {error && <p role="alert" className="mx-5 mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        <div className="grid min-h-0 gap-4 overflow-y-auto overscroll-contain p-5 sm:grid-cols-2 sm:p-6">
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
        <footer className="flex shrink-0 flex-col gap-2 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row-reverse sm:px-6">
          <button type="submit" disabled={busy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50 sm:w-auto">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />} Ajouter</button>
          <button type="button" disabled={busy} onClick={() => setFormOpen(false)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground sm:w-auto"><X className="h-4 w-4" /> Annuler</button>
        </footer>
        </form>
      </RhFormModal>
    </>
  );
}
