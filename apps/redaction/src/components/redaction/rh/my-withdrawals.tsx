'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { formatMinorUnits, type RhCurrency } from '@/lib/redaction/rh/money';
import { validateWithdrawal, type Balance, type Withdrawal, type WithdrawalMethod } from '@/lib/redaction/rh/withdrawals';
const endpoint = '/api/redaction/rh/mon-espace/retraits';
const statuses = { pending: 'En attente', approved: 'Approuvée', rejected: 'Refusée', cancelled: 'Annulée', paid: 'Payée' } as const;
const methods = { mobile_money: 'Mobile Money', virement: 'Virement', especes: 'Espèces', autre: 'Autre' } as const;
export function MyWithdrawals() {
  const [balances, setBalances] = useState<Balance[]>([]); const [items, setItems] = useState<Withdrawal[]>([]);
  const [currency, setCurrency] = useState<RhCurrency>('CDF'); const [amount, setAmount] = useState(''); const [method, setMethod] = useState<WithdrawalMethod>('mobile_money');
  const [loading, setLoading] = useState(true); const [failed, setFailed] = useState(false); const [busy, setBusy] = useState(false); const [reload, setReload] = useState(0);
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const key = useRef<string | null>(null);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setFailed(false); setError('');
    fetchRedaction(endpoint, { cache: 'no-store', signal: controller.signal }).then(async (r) => { if (!r.ok) throw new Error(); const data = await r.json(); setBalances(data.balances); setItems(data.withdrawals); })
      .catch(() => { if (!controller.signal.aborted) { setFailed(true); setError('Impossible de charger les soldes et retraits.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  async function send(methodName: 'POST' | 'PATCH', body: unknown) {
    setBusy(true); setError(''); setMessage('');
    try {
      const r = await fetchRedaction(endpoint, { method: methodName, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Opération impossible.');
      if (methodName === 'POST') { key.current = null; setAmount(''); }
      setMessage(methodName === 'POST' ? 'Demande enregistrée.' : 'Demande annulée.'); setReload((n) => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Opération impossible.'); }
    finally { setBusy(false); }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); key.current ??= crypto.randomUUID();
    const payload = { key: key.current, currency, amount, method };
    if (!validateWithdrawal(payload)) { setError('Vérifiez le montant et la devise.'); return; }
    void send('POST', payload);
  }
  return <section className="space-y-4 rounded-xl border border-border bg-card p-5">
    <h2 className="font-semibold">Mes soldes et retraits</h2>
    <p className="text-sm text-muted-foreground">Le solde prend en compte les montants validés, les demandes réservées et les paiements enregistrés. Aucun transfert automatique n’est effectué.</p>
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}{message && <p role="status" className="text-sm text-primary">{message}</p>}
    {loading ? <p className="text-sm">Chargement…</p> : failed ? null : <>
      {balances.map((b) => <div key={b.currency} className="rounded-lg border border-border p-3 text-sm">{b.available === null ? <p className="font-semibold">{b.currency} · Solde initial non établi</p> : <><p className="font-semibold">Disponible : {formatMinorUnits(BigInt(b.available), b.currency)}</p><p className="text-muted-foreground">Solde initial jusqu’au {b.throughMonth} : {formatMinorUnits(BigInt(b.opening!), b.currency)} · Rémunérations ultérieures : {formatMinorUnits(BigInt(b.validated), b.currency)} · Ajustements crédit : {formatMinorUnits(BigInt(b.adjustmentCredits), b.currency)} · Ajustements diminution : {formatMinorUnits(BigInt(b.adjustmentDebits), b.currency)} · Réservé : {formatMinorUnits(BigInt(b.reserved), b.currency)} · Payé : {formatMinorUnits(BigInt(b.paid), b.currency)}</p></>}</div>)}
      {items.map((item) => <article key={item.id} className="rounded-lg border border-border p-3 text-sm"><p className="font-semibold">{formatMinorUnits(BigInt(item.amountMinor), item.currency)} · {statuses[item.status]}</p><p>{methods[item.method]}{item.paymentDate && ` · payé le ${item.paymentDate}`}{item.paymentReference && ` · référence : ${item.paymentReference}`}</p>{item.decisionNote && <p>Motif : {item.decisionNote}</p>}{item.status === 'pending' && <button type="button" disabled={busy} className="mt-2 text-primary underline" onClick={() => { if (window.confirm('Annuler cette demande ?')) void send('PATCH', { action: 'cancel', id: item.id, version: item.version }); }}>Annuler</button>}</article>)}
      {items.length === 500 && <p className="text-xs text-muted-foreground">Les 500 demandes les plus récentes sont affichées.</p>}
      <form onSubmit={submit} className="space-y-3 border-t border-border pt-4"><h3 className="font-semibold">Demander un retrait</h3><p className="text-xs text-muted-foreground">Un solde initial doit être établi par l’administrateur avant toute demande. Ne saisissez pas ici vos coordonnées bancaires ou Mobile Money.</p>
        <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Montant<input required value={amount} disabled={busy} inputMode="decimal" maxLength={18} onChange={(e) => { setAmount(e.target.value); key.current = null; }} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
        <label className="text-sm">Devise<select disabled={busy} value={currency} onChange={(e) => { setCurrency(e.target.value as RhCurrency); key.current = null; }} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"><option value="CDF">CDF</option><option value="USD">USD</option></select></label>
        <label className="text-sm">Moyen<select disabled={busy} value={method} onChange={(e) => { setMethod(e.target.value as WithdrawalMethod); key.current = null; }} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2">{Object.entries(methods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        <button type="submit" disabled={busy || balances.find((b) => b.currency === currency)?.available == null} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Envoi…' : 'Demander'}</button>
      </form>
    </>}
  </section>;
}
