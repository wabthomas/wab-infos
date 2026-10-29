'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { validateRemuneration, type Remuneration } from '@/lib/redaction/rh/remunerations';
import { formatMinorUnits, type RhCurrency } from '@/lib/redaction/rh/money';
import type { Collaborator } from '@/lib/redaction/rh/collaborator';

const labels = { draft: 'Brouillon', validated: 'Validé', cancelled: 'Annulé' } as const;
export function Remunerations({ enabled, initialMonth }: { enabled: boolean; initialMonth: string }) {
  const [people, setPeople] = useState<Collaborator[]>([]); const [person, setPerson] = useState('');
  const [rows, setRows] = useState<Remuneration[]>([]); const [month, setMonth] = useState(initialMonth);
  const [currency, setCurrency] = useState<RhCurrency>('CDF'); const [amount, setAmount] = useState('');
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(false); const [failed, setFailed] = useState(false); const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetchRedaction('/api/redaction/rh/collaborateurs', { cache: 'no-store', signal: controller.signal }).then(async (r) => {
      if (!r.ok) throw new Error(); const data = await r.json();
      const active = data.collaborators.filter((p: Collaborator) => !p.archived); setPeople(active);
      setPerson((current) => active.some((p: Collaborator) => p.id === current) ? current : '');
    }).catch(() => { if (!controller.signal.aborted) setError('Impossible de charger les collaborateurs.'); });
    return () => controller.abort();
  }, [enabled, reload]);
  useEffect(() => {
    const refresh = () => setReload((n) => n + 1); window.addEventListener('rh-collaborators-changed', refresh);
    return () => window.removeEventListener('rh-collaborators-changed', refresh);
  }, []);
  useEffect(() => {
    setRows([]); setFailed(false);
    if (!enabled || !person) { setLoading(false); return; }
    const controller = new AbortController(); setLoading(true); setError('');
    fetchRedaction(`/api/redaction/rh/remunerations?${new URLSearchParams({ collaboratorId: person })}`, { cache: 'no-store', signal: controller.signal }).then(async (r) => {
      if (!r.ok) throw new Error(); const data = await r.json(); setRows(data.remunerations);
    }).catch(() => { if (!controller.signal.aborted) { setFailed(true); setError('Impossible de charger les rémunérations. Vérifiez la configuration et la migration RH.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled, person, reload]);
  async function send(method: 'POST' | 'PATCH', body: unknown) {
    setBusy(true); setError(''); setMessage('');
    try {
      const r = await fetchRedaction('/api/redaction/rh/remunerations', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Opération impossible.');
      setAmount(''); setMessage('Opération enregistrée.'); setReload((n) => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Opération impossible.'); }
    finally { setBusy(false); }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = { collaboratorId: person, month, currency, amount };
    if (!validateRemuneration(raw)) { setError('Vérifiez le mois, la devise et le montant.'); return; }
    void send('POST', raw);
  }
  return <section className="space-y-4 rounded-xl border border-border bg-card p-5">
    <div><h2 className="font-display text-lg font-bold">Rémunérations mensuelles</h2>
      <p className="mt-1 text-sm text-muted-foreground">Montants saisis et validés manuellement, par devise. Aucun calcul de paie, retrait ou paiement n’est effectué.</p></div>
    {!enabled ? <p className="text-sm text-muted-foreground">Suivi désactivé par défaut. Consultez le guide avant toute activation.</p> : <>
      <p className="rounded-lg bg-muted p-3 text-xs">La validation est définitive : une correction du solde passe par un ajustement distinct lorsque les retraits sont activés. Validez uniquement un montant vérifié selon les règles applicables en RDC.</p>
      {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
      {message && <p role="status" className="text-sm text-primary">{message}</p>}
      <label className="block text-sm font-medium">Collaborateur<select disabled={busy} value={person} onChange={(e) => { setPerson(e.target.value); setMessage(''); }} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"><option value="">Sélectionner…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.team}</option>)}</select></label>
      {person && (loading ? <p className="text-sm">Chargement…</p> : failed ? null : <>
        <div className="space-y-2">{rows.length === 0 && <p className="text-sm text-muted-foreground">Aucune rémunération enregistrée.</p>}
          {rows.map((r) => <article key={r.id} className="rounded-lg border border-border p-3 text-sm"><p className="font-semibold">{r.month} · {formatMinorUnits(BigInt(r.amountMinor), r.currency)} · {labels[r.status]}</p>
            {r.status === 'draft' && <div className="mt-2 flex gap-4"><button type="button" disabled={busy} className="font-semibold text-primary underline" onClick={() => { if (window.confirm(`Valider définitivement ${formatMinorUnits(BigInt(r.amountMinor), r.currency)} pour ${r.month} ? Le montant validé ne pourra pas être modifié.`)) void send('PATCH', { id: r.id, version: r.version, action: 'validate' }); }}>Valider</button><button type="button" disabled={busy} className="text-red-700 underline dark:text-red-300" onClick={() => { if (window.confirm('Annuler ce brouillon ?')) void send('PATCH', { id: r.id, version: r.version, action: 'cancel' }); }}>Annuler</button></div>}
          </article>)}{rows.length === 500 && <p className="text-xs text-muted-foreground">Les 500 derniers éléments sont affichés.</p>}</div>
        <form onSubmit={submit} className="space-y-3 border-t border-border pt-4"><h3 className="font-semibold">Ajouter un montant à vérifier</h3>
          <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm font-medium">Mois<input type="month" min="1900-01" max="9999-12" required value={month} onChange={(e) => setMonth(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
          <label className="text-sm font-medium">Devise<select value={currency} onChange={(e) => setCurrency(e.target.value as RhCurrency)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"><option value="CDF">CDF</option><option value="USD">USD</option></select></label>
          <label className="text-sm font-medium">Montant mensuel<input type="text" inputMode="decimal" autoComplete="off" required maxLength={18} value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label></div>
          <p className="text-xs text-muted-foreground">Montant manuel non négatif, deux décimales au maximum. Aucun ajustement automatique ni conversion entre devises.</p>
          <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Enregistrement…' : 'Créer le brouillon'}</button>
        </form>
      </>)}
    </>}
  </section>;
}
