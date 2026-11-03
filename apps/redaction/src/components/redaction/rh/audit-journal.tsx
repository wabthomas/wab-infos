'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { AUDIT_MAX_PAGE } from '@/lib/redaction/rh/audit-pagination';

type AuditRow = {
  id: string;
  actorEmail: string;
  action: string;
  collaboratorId: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
};
type AuditResult = { rows: AuditRow[]; total: number; page: number; pageSize: number; snapshot: string };

export function AuditJournal() {
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const snapshot = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const query = new URLSearchParams({ page: String(page) });
    if (snapshot.current !== null) query.set('snapshot', snapshot.current);
    fetchRedaction(`/api/redaction/rh/audit?${query}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const result = await response.json() as AuditResult;
        if (controller.signal.aborted) return;
        snapshot.current = result.snapshot;
        setData(result);
      })
      .catch(() => { if (!controller.signal.aborted) { setData(null); setError('Journal indisponible. Vérifiez vos droits ou réessayez.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, reload]);

  function refresh() {
    snapshot.current = null;
    setPage(1);
    setReload((value) => value + 1);
  }

  const pages = data ? Math.max(1, Math.min(AUDIT_MAX_PAGE, Math.ceil(data.total / data.pageSize))) : 1;
  const pageButtons = data ? Array.from(
    { length: Math.min(5, pages) },
    (_, index) => Math.max(1, Math.min(data.page - 2, pages - 4)) + index,
  ) : [];

  return <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-bold">Journal d’audit</h2>
        <p className="mt-1 text-xs text-muted-foreground">Opérations RH, de la plus récente à la plus ancienne. Lecture réservée au super-administrateur.</p>
      </div>
      <button type="button" disabled={loading} onClick={refresh} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50">
        <RefreshCw className="h-4 w-4" /> Actualiser
      </button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {loading && <p role="status" className="text-sm text-muted-foreground">Chargement du journal…</p>}
    {!loading && data && <>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {data.total === 0 ? 'Aucune opération journalisée.' : `${(data.page - 1) * data.pageSize + 1}–${Math.min(data.page * data.pageSize, data.total)} sur ${data.total} opérations`}
      </p>
      {data.rows.length > 0 && <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="bg-muted/60 text-muted-foreground"><tr>
            <th scope="col" className="px-3 py-2">Date</th>
            <th scope="col" className="px-3 py-2">Action</th>
            <th scope="col" className="px-3 py-2">Acteur</th>
            <th scope="col" className="px-3 py-2">Collaborateur</th>
          </tr></thead>
          <tbody>{data.rows.map((row) => <tr key={row.id} className="border-t border-border">
            <td className="whitespace-nowrap px-3 py-2"><time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</time></td>
            <td className="px-3 py-2 font-medium">{row.action}</td>
            <td className="break-all px-3 py-2">{row.actorEmail}</td>
            <td className="px-3 py-2">{row.firstName || row.lastName ? `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() : row.collaboratorId}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      {pages > 1 && <nav aria-label="Pagination du journal d’audit" className="flex flex-wrap items-center gap-1.5 text-xs">
        <button type="button" disabled={loading || page === 1} onClick={() => setPage(1)} className="rounded-lg border border-border px-2.5 py-2 disabled:opacity-40">Début</button>
        <button type="button" disabled={loading || page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-border px-2.5 py-2 disabled:opacity-40">Précédent</button>
        {pageButtons.map((number) => <button key={number} type="button" disabled={loading} aria-current={page === number ? 'page' : undefined} aria-label={`Page ${number}`} onClick={() => setPage(number)} className={`rounded-lg border px-3 py-2 disabled:opacity-40 ${page === number ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>{number}</button>)}
        <button type="button" disabled={loading || page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-border px-2.5 py-2 disabled:opacity-40">Suivant</button>
        <button type="button" disabled={loading || page >= pages} onClick={() => setPage(pages)} className="rounded-lg border border-border px-2.5 py-2 disabled:opacity-40">Fin</button>
        <span className="ml-2 text-muted-foreground">Page {data.page} / {pages}</span>
      </nav>}
    </>}
  </section>;
}
