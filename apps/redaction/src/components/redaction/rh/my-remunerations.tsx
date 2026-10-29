'use client';
import { useEffect, useState } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { formatMinorUnits } from '@/lib/redaction/rh/money';
import type { Remuneration } from '@/lib/redaction/rh/remunerations';
export function MyRemunerations() {
  const [rows, setRows] = useState<Remuneration[]>([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetchRedaction('/api/redaction/rh/mon-espace/remunerations', { cache: 'no-store', signal: controller.signal }).then(async (r) => {
      if (!r.ok) throw new Error(); const data = await r.json(); setRows(data.remunerations);
    }).catch(() => { if (!controller.signal.aborted) setError('Impossible de charger vos rémunérations.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  return <section className="space-y-3 rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">Mes rémunérations validées</h2>
    <p className="text-sm text-muted-foreground">Montants validés par l’admin. Consultez la section des retraits si elle est activée.</p>
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    {loading ? <p className="text-sm">Chargement…</p> : !error && rows.length === 0 ? <p className="text-sm text-muted-foreground">Aucun montant validé.</p> : null}
    {rows.map((r) => <article key={r.id} className="rounded-lg border border-border p-3 text-sm"><p className="font-semibold">{r.month} · {formatMinorUnits(BigInt(r.amountMinor), r.currency)}</p><p className="text-muted-foreground">Montant validé</p></article>)}
    {rows.length === 500 && <p className="text-xs text-muted-foreground">Les 500 derniers éléments sont affichés.</p>}
  </section>;
}
