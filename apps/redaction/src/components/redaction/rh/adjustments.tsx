'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { formatMinorUnits, type RhCurrency } from '@/lib/redaction/rh/money';
import { validateAdjustment, type Adjustment, type AdjustmentDirection } from '@/lib/redaction/rh/adjustments';
import type { Collaborator } from '@/lib/redaction/rh/collaborator';

const labels = { draft: 'Brouillon', validated: 'Validé', cancelled: 'Annulé' } as const;
const endpoint = '/api/redaction/rh/ajustements';
export function Adjustments({ enabled }: { enabled: boolean }) {
  const [people, setPeople] = useState<Collaborator[]>([]); const [person, setPerson] = useState(''); const [items, setItems] = useState<Adjustment[]>([]);
  const [currency, setCurrency] = useState<RhCurrency>('CDF'); const [direction, setDirection] = useState<AdjustmentDirection>('credit'); const [amount, setAmount] = useState(''); const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false); const [failed, setFailed] = useState(false); const [busy, setBusy] = useState(false); const [reload, setReload] = useState(0);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetchRedaction('/api/redaction/rh/collaborateurs', { cache: 'no-store', signal: controller.signal }).then(async (r) => {
      if (!r.ok) throw new Error(); const data = await r.json(); const active = data.collaborators.filter((p: Collaborator) => !p.archived); setPeople(active); setPerson((old) => active.some((p: Collaborator) => p.id === old) ? old : '');
    }).catch(() => { if (!controller.signal.aborted) setError('Impossible de charger les collaborateurs.'); });
    return () => controller.abort();
  }, [enabled, reload]);
  useEffect(() => {
    setItems([]); setFailed(false);
    if (!enabled || !person) { setLoading(false); return; }
    const controller = new AbortController(); setLoading(true); setError('');
    fetchRedaction(`${endpoint}?${new URLSearchParams({ collaboratorId: person })}`, { cache: 'no-store', signal: controller.signal }).then(async (r) => { if (!r.ok) throw new Error(); const data = await r.json(); setItems(data.adjustments); })
      .catch(() => { if (!controller.signal.aborted) { setFailed(true); setError('Impossible de charger les ajustements. Vérifiez la migration RH.'); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled, person, reload]);
  async function send(method: 'POST' | 'PATCH', body: unknown) {
    setBusy(true); setError(''); setMessage('');
    try { const r = await fetchRedaction(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Opération impossible.'); setAmount(''); setReason(''); setMessage('Opération enregistrée.'); setReload((n) => n + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'Opération impossible.'); } finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const body = { collaboratorId: person, currency, direction, amount, reason };
    if (!validateAdjustment(body)) { setError('Vérifiez le montant et le motif.'); return; }
    void send('POST', body);
  }
  function decide(item: Adjustment, action: 'validate' | 'cancel') {
    if (!window.confirm(action === 'validate' ? 'Valider définitivement cet ajustement ? Il modifiera le solde disponible.' : 'Annuler ce brouillon ?')) return;
    void send('PATCH', { id: item.id, version: item.version, action });
  }
  return <section className="space-y-4 rounded-xl border border-border bg-card p-5">
    <div><h2 className="font-display text-lg font-bold">Ajustements manuels</h2><p className="mt-1 text-sm text-muted-foreground">Corrections du solde, sans modifier les montants mensuels déjà validés.</p></div>
    {!enabled ? <p className="text-sm text-muted-foreground">Fonction désactivée avec les retraits. Consultez le guide avant activation.</p> : <>
      <p className="rounded-xl bg-amber-500/10 p-3 text-xs leading-5 text-muted-foreground">Aucun ajustement n’est automatique. Avant toute diminution, faites valider son fondement et ses règles en RDC. Le motif sera visible par le collaborateur ; n’y saisissez aucune donnée sensible.</p>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}{message && <p role="status" className="text-sm text-primary">{message}</p>}
      <label className="block text-sm font-medium">Collaborateur<select disabled={busy} value={person} onChange={(e) => { setPerson(e.target.value); setAmount(''); setReason(''); setMessage(''); }} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"><option value="">Sélectionner…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.team}</option>)}</select></label>
      {person && (loading ? <p className="text-sm">Chargement…</p> : failed ? null : <>
        <div className="space-y-2">{items.length === 0 && <p className="text-sm text-muted-foreground">Aucun ajustement.</p>}{items.map((item) => <article key={item.id} className="rounded-xl border border-border p-3 text-sm"><p className="font-semibold">{item.direction === 'credit' ? 'Crédit' : 'Diminution'} · {formatMinorUnits(BigInt(item.amountMinor), item.currency)} · {labels[item.status]}</p><p className="mt-1 text-muted-foreground">Motif : {item.reason}</p>{item.status === 'draft' && <div className="mt-2 flex gap-4"><button type="button" disabled={busy} onClick={() => decide(item, 'validate')} className="font-semibold text-primary underline">Valider</button><button type="button" disabled={busy} onClick={() => decide(item, 'cancel')} className="text-red-700 underline dark:text-red-300">Annuler le brouillon</button></div>}</article>)}{items.length === 500 && <p className="text-xs text-muted-foreground">Les 500 derniers ajustements sont affichés.</p>}</div>
        <form onSubmit={submit} className="space-y-3 border-t border-border pt-4"><h3 className="font-semibold">Proposer une correction</h3><p className="text-xs text-muted-foreground">Un solde initial doit exister dans la devise choisie. Un ajustement validé ne peut pas être modifié ni annulé ; une correction ultérieure nécessite une nouvelle écriture.</p>
          <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm font-medium">Type<select value={direction} onChange={(e) => setDirection(e.target.value as AdjustmentDirection)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"><option value="credit">Crédit</option><option value="debit">Diminution</option></select></label><label className="text-sm font-medium">Devise<select value={currency} onChange={(e) => setCurrency(e.target.value as RhCurrency)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"><option>CDF</option><option>USD</option></select></label><label className="text-sm font-medium">Montant<input required inputMode="decimal" maxLength={18} value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label></div>
          <label className="block text-sm font-medium">Motif visible par le collaborateur<input required maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
          <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Créer le brouillon</button>
        </form>
      </>)}
    </>}
  </section>;
}
export function MyAdjustments() {
  const [items, setItems] = useState<Adjustment[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); fetchRedaction('/api/redaction/rh/mon-espace/ajustements', { cache: 'no-store', signal: controller.signal }).then(async (r) => { if (!r.ok) throw new Error(); const data = await r.json(); setItems(data.adjustments); }).catch(() => { if (!controller.signal.aborted) setError('Impossible de charger vos ajustements.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, []);
  return <section className="space-y-3 rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">Mes ajustements validés</h2><p className="text-xs text-muted-foreground">Pour toute question ou contestation, contactez l’administrateur.</p>{error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}{loading ? <p className="text-sm">Chargement…</p> : !error && items.length === 0 ? <p className="text-sm text-muted-foreground">Aucun ajustement validé.</p> : null}{items.map((item) => <article key={item.id} className="rounded-xl border border-border p-3 text-sm"><p className="font-semibold">{item.direction === 'credit' ? 'Crédit' : 'Diminution'} · {formatMinorUnits(BigInt(item.amountMinor), item.currency)}</p><p className="mt-1 text-muted-foreground">Motif : {item.reason}</p></article>)}{items.length === 500 && <p className="text-xs text-muted-foreground">Les 500 derniers ajustements sont affichés.</p>}</section>;
}
