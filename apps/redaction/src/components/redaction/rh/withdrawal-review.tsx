'use client';
import { useEffect, useState } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { formatMinorUnits, type RhCurrency } from '@/lib/redaction/rh/money';
import { validateOpeningBalance } from '@/lib/redaction/rh/opening-balances';
import { validateWithdrawalDecision, type Balance, type Withdrawal } from '@/lib/redaction/rh/withdrawals';
import type { Collaborator } from '@/lib/redaction/rh/collaborator';
const labels = { pending: 'En attente', approved: 'Approuvée', rejected: 'Refusée', cancelled: 'Annulée', paid: 'Payée' } as const;
const methods = { mobile_money: 'Mobile Money', virement: 'Virement', especes: 'Espèces', autre: 'Autre' } as const;
export function WithdrawalReview({ enabled, today, allowOpening }: { enabled: boolean; today: string; allowOpening: boolean }) {
  const [people, setPeople] = useState<Collaborator[]>([]); const [person, setPerson] = useState(''); const [balances, setBalances] = useState<Balance[]>([]); const [items, setItems] = useState<Withdrawal[]>([]);
  const [openingCurrency, setOpeningCurrency] = useState<RhCurrency>('CDF'); const [openingMonth, setOpeningMonth] = useState(today.slice(0, 7)); const [openingAmount, setOpeningAmount] = useState(''); const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({}); const [dates, setDates] = useState<Record<string, string>>({}); const [refs, setRefs] = useState<Record<string, string>>({});
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false); const [failed, setFailed] = useState(false); const [busy, setBusy] = useState(false); const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController(); fetchRedaction('/api/redaction/rh/collaborateurs', { cache: 'no-store', signal: controller.signal }).then(async (r) => {
      if (!r.ok) throw new Error(); const data = await r.json(); const active = data.collaborators.filter((p: Collaborator) => !p.archived); setPeople(active); setPerson((current) => active.some((p: Collaborator) => p.id === current) ? current : '');
    }).catch(() => { if (!controller.signal.aborted) setError('Impossible de charger les collaborateurs.'); });
    return () => controller.abort();
  }, [enabled, reload]);
  useEffect(() => {
    setItems([]); setBalances([]); setFailed(false); setNotes({}); setDates({}); setRefs({});
    if (!enabled || !person) { setLoading(false); return; }
    const controller = new AbortController(); setLoading(true); setError('');
    fetchRedaction(`/api/redaction/rh/retraits?${new URLSearchParams({ collaboratorId: person })}`, { cache: 'no-store', signal: controller.signal }).then(async (r) => { if (!r.ok) throw new Error(); const data = await r.json(); setItems(data.withdrawals); setBalances(data.balances); })
      .catch(() => { if (!controller.signal.aborted) { setFailed(true); setError('Impossible de charger les retraits.'); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled, person, reload]);
  async function openBalance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('');
    const body = { collaboratorId: person, currency: openingCurrency, throughMonth: openingMonth, amount: openingAmount, confirmed };
    if (!validateOpeningBalance(body, today.slice(0, 7))) { setError('Vérifiez le solde, le mois et la confirmation.'); return; }
    if (!window.confirm('Confirmer ce solde initial définitif ? Les rémunérations jusqu’au mois indiqué sont incluses dans ce montant et ne seront pas ajoutées à nouveau.')) return;
    setBusy(true);
    try { const r = await fetchRedaction('/api/redaction/rh/soldes-initiaux', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Initialisation impossible.'); setOpeningAmount(''); setConfirmed(false); setMessage('Solde initial établi.'); setReload((n) => n + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'Initialisation impossible.'); } finally { setBusy(false); }
  }
  async function decide(item: Withdrawal, action: 'approve' | 'reject' | 'pay') {
    const raw = { action, note: notes[item.id] ?? '', paymentDate: dates[item.id] ?? '', paymentReference: refs[item.id] ?? '' };
    if (action === 'pay' && (item.method === 'mobile_money' || item.method === 'virement') && !raw.paymentReference.trim()) { setError('La référence est obligatoire pour ce moyen de paiement.'); return; }
    if (!validateWithdrawalDecision(raw, today)) { setError('Vérifiez les champs : motif obligatoire pour le refus, date valide pour le paiement.'); return; }
    if (!window.confirm(action === 'pay' ? 'Confirmer que le paiement a déjà été effectué hors du système ? Cette action est définitive.' : action === 'approve' ? 'Approuver cette demande ?' : 'Refuser cette demande et libérer le montant réservé ?')) return;
    setBusy(true); setError(''); setMessage('');
    try { const r = await fetchRedaction('/api/redaction/rh/retraits', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...raw, id: item.id, version: item.version }) }); const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Opération impossible.'); setMessage('Décision enregistrée.'); setReload((n) => n + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'Opération impossible.'); } finally { setBusy(false); }
  }
  return <section className="space-y-4 rounded-xl border border-border bg-card p-5"><h2 className="font-display text-lg font-bold">Demandes de retrait</h2>
    <p className="text-sm text-muted-foreground">Suivi manuel : le système ne transfère pas d’argent. Un admin ne peut pas traiter son propre retrait.</p>
    {!enabled ? <p className="text-sm text-muted-foreground">Fonction désactivée par défaut. Consultez le guide avant activation.</p> : <>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}{message && <p role="status" className="text-sm text-primary">{message}</p>}
      <label className="block text-sm">Collaborateur<select disabled={busy} value={person} onChange={(e) => { setPerson(e.target.value); setOpeningAmount(''); setConfirmed(false); }} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"><option value="">Sélectionner…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.team}</option>)}</select></label>
      {person && (loading ? <p className="text-sm">Chargement…</p> : failed ? null : <>
        {balances.map((b) => <div key={b.currency} className="rounded-lg border border-border p-3 text-sm">{b.available === null ? <p className="font-semibold">{b.currency} · Solde initial non établi : aucun retrait possible.</p> : <><p className="font-semibold">Disponible : {formatMinorUnits(BigInt(b.available), b.currency)}</p><p className="mt-1 text-xs text-muted-foreground">Solde initial jusqu’au {b.throughMonth} : {formatMinorUnits(BigInt(b.opening!), b.currency)} · Rémunérations ultérieures : {formatMinorUnits(BigInt(b.validated), b.currency)} · Ajustements crédit : {formatMinorUnits(BigInt(b.adjustmentCredits), b.currency)} · Ajustements diminution : {formatMinorUnits(BigInt(b.adjustmentDebits), b.currency)} · Réservé : {formatMinorUnits(BigInt(b.reserved), b.currency)} · Payé : {formatMinorUnits(BigInt(b.paid), b.currency)}</p></>}</div>)}
        {allowOpening && <form onSubmit={openBalance} className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4"><h3 className="font-semibold">Établir un solde initial</h3><p className="text-xs leading-5 text-muted-foreground">Après rapprochement des paiements historiques, saisissez le montant encore dû à la fin du mois choisi. Les rémunérations jusqu’à ce mois ne seront pas additionnées. Vérifiez aussi que les rémunérations ultérieures n’ont pas déjà été payées hors système. Cette opération est définitive : une correction éventuelle doit passer par un ajustement distinct.</p><div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Devise<select value={openingCurrency} disabled={busy} onChange={(e) => setOpeningCurrency(e.target.value as RhCurrency)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"><option>CDF</option><option>USD</option></select></label><label className="text-sm">Jusqu’au mois inclus<input type="month" min="1900-01" max={today.slice(0, 7)} value={openingMonth} disabled={busy} onChange={(e) => setOpeningMonth(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label><label className="text-sm">Montant encore dû<input value={openingAmount} disabled={busy} required inputMode="decimal" maxLength={18} onChange={(e) => setOpeningAmount(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label></div><label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={confirmed} disabled={busy} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" /><span>Je confirme avoir rapproché les paiements historiques et compris que ce solde ne peut pas être modifié ici.</span></label><button type="submit" disabled={busy || !confirmed} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Établir le solde</button></form>}
        {items.length === 0 && <p className="text-sm text-muted-foreground">Aucune demande.</p>}
        {items.map((item) => <article key={item.id} className="space-y-2 rounded-lg border border-border p-3 text-sm"><p className="font-semibold">{formatMinorUnits(BigInt(item.amountMinor), item.currency)} · {labels[item.status]}</p><p>{methods[item.method]}{item.paymentDate && ` · payé le ${item.paymentDate}`}{item.paymentReference && ` · référence : ${item.paymentReference}`}</p>{item.decisionNote && <p>Motif : {item.decisionNote}</p>}
          {(item.status === 'pending' || item.status === 'approved') && <><label className="block">Motif (obligatoire pour un refus)<input maxLength={500} value={notes[item.id] ?? ''} onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
          {item.status === 'approved' && <div className="grid gap-2 sm:grid-cols-2"><label>Date du paiement effectué<input type="date" max={today} value={dates[item.id] ?? ''} onChange={(e) => setDates({ ...dates, [item.id]: e.target.value })} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label><label>Référence (obligatoire pour Mobile Money et virement)<input maxLength={150} value={refs[item.id] ?? ''} onChange={(e) => setRefs({ ...refs, [item.id]: e.target.value })} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label></div>}
          <div className="flex flex-wrap gap-4">{item.status === 'pending' && <button disabled={busy} type="button" onClick={() => void decide(item, 'approve')} className="text-primary underline">Approuver</button>}{item.status === 'approved' && <button disabled={busy} type="button" onClick={() => void decide(item, 'pay')} className="text-primary underline">Enregistrer le paiement</button>}<button disabled={busy} type="button" onClick={() => void decide(item, 'reject')} className="text-red-700 underline dark:text-red-300">Refuser</button></div></>}
        </article>)}{items.length === 500 && <p className="text-xs text-muted-foreground">Les 500 demandes les plus récentes sont affichées.</p>}
      </>)}
    </>}
  </section>;
}
