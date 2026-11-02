'use client';
import { useRhNotice } from './use-rh-notice';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { formatMinorUnits } from '@/lib/redaction/rh/money';
import { historyUrl, type HistoryPeriod } from '@/lib/redaction/rh/personal-history';
import type { Withdrawal } from '@/lib/redaction/rh/withdrawals';
import { PersonalHistoryControls } from './personal-history-controls';

const endpoint = '/api/redaction/rh/mon-espace/retraits/paiements';
const methodLabels: Record<Withdrawal['method'], string> = {
  mobile_money: 'Mobile Money',
  virement: 'Virement',
  especes: 'Espèces',
  autre: 'Autre',
};

export function MyPaymentHistory({ refresh = 0 }: { refresh?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<{ period: Exclude<HistoryPeriod, 'recent'>; value: string }>({ period: 'all', value: '' });
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useRhNotice('error');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (expanded && ((filter.period === 'month' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(filter.value)) || (filter.period === 'year' && !/^(19|20)\d{2}$/.test(filter.value)))) {
      setItems([]); setHasMore(false); setLoading(false); return;
    }
    const controller = new AbortController();
    setLoading(true); setError('');
    fetchRedaction(historyUrl(endpoint, expanded ? filter.period : 'recent', filter.value, page), { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json() as { payments: Withdrawal[]; hasMore: boolean };
        setItems((previous) => page === 1 ? data.payments : [...previous, ...data.payments.filter((item) => !previous.some((old) => old.id === item.id))]);
        setHasMore(data.hasMore);
      })
      .catch(() => { if (!controller.signal.aborted) setError('Impossible de charger les paiements. Réessayez.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [expanded, filter, page, refresh, reload]);

  function changeView(nextExpanded: boolean) {
    setExpanded(nextExpanded);
    setPage(1);
    setItems([]);
    setHasMore(false);
  }

  return <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="font-display text-lg font-bold">Historique des paiements</h2>
        <p className="mt-1 text-xs text-muted-foreground">{expanded ? 'Paiements enregistrés par l’administration' : 'Jusqu’à 6 paiements de cette semaine'}</p></div>
      <div className="flex gap-3">
        <button type="button" onClick={() => { setPage(1); setReload((n) => n + 1); }} aria-label="Actualiser les paiements" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><RefreshCw className="h-4 w-4" /></button>
        <button type="button" aria-expanded={expanded} onClick={() => changeView(!expanded)} className="text-sm font-semibold text-primary underline">{expanded ? 'Réduire' : 'Voir plus'}</button>
      </div>
    </div>
    {expanded && <PersonalHistoryControls filter={filter} onChange={(next) => { setFilter(next); setPage(1); setItems([]); setHasMore(false); }} />}
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    {loading && <p role="status" className="text-sm text-muted-foreground">Chargement…</p>}
    {(!loading || page > 1) && !error && items.length === 0 && <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">Aucun paiement pour cette période.</p>}
    {(!loading || page > 1) && <div className="space-y-2">{items.map((item) => <article key={item.id} className="rounded-xl border border-border p-3.5 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2"><div>
        <p className="font-semibold">{formatMinorUnits(BigInt(item.amountMinor), item.currency)} · {methodLabels[item.method]}</p>
        <p className="mt-1 text-xs text-muted-foreground">Payé le <time dateTime={item.paymentDate ?? undefined}>{item.paymentDate}</time>{item.paymentReference ? ` · Référence : ${item.paymentReference}` : ''}</p>
      </div><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">Payé</span></div>
      <Link href={`/mon-rh/recu/${item.id}`} className="mt-2 inline-block text-xs font-semibold text-primary underline">Télécharger le reçu</Link>
    </article>)}</div>}
    {expanded && hasMore && <button type="button" disabled={loading} onClick={() => setPage((n) => n + 1)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">Charger plus de paiements</button>}
  </section>;
}
