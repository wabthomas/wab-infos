'use client';
import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, RefreshCw } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { rhNotificationMessage, type RhNotification } from '@/lib/redaction/rh/notifications';

const endpoint = '/api/redaction/rh/mon-espace/notifications';
export function MyNotifications() {
  const [items, setItems] = useState<RhNotification[]>([]);
  const [loading, setLoading] = useState(true); const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try {
      const response = await fetchRedaction(endpoint, { cache: 'no-store', signal });
      if (!response.ok) throw new Error();
      const data = await response.json(); setItems(data.notifications);
    } catch { if (!signal?.aborted) setError('Impossible de charger les notifications RH.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  async function markRead(id: string) {
    setBusyId(id); setError('');
    try {
      const response = await fetchRedaction(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (!response.ok) throw new Error();
      await load();
    } catch { setError('Impossible de marquer cette notification comme lue.'); }
    finally { setBusyId(null); }
  }
  const unreadVisible = items.filter((item) => !item.readAt).length;
  return <section className="space-y-4 rounded-xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.07] text-primary"><Bell className="h-5 w-5" /></span><div><h2 className="font-semibold">Notifications RH</h2><p className="mt-0.5 text-xs text-muted-foreground">{unreadVisible ? `${unreadVisible} non lue${unreadVisible > 1 ? 's' : ''} parmi les notifications affichées` : 'Suivez les mises à jour de votre dossier.'}</p></div></div>
      <button type="button" disabled={loading || !!busyId} onClick={() => void load()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" /> Actualiser</button></div>
    {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {loading ? <p className="text-sm text-muted-foreground">Chargement…</p> : !error && items.length === 0 ? <p className="text-sm text-muted-foreground">Aucune notification pour le moment.</p> : null}
    {!loading && items.map((item) => <article key={item.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${item.readAt ? 'border-border' : 'border-primary/20 bg-primary/[0.04]'}`}>
      <div className="min-w-0"><p className="text-sm font-semibold">{rhNotificationMessage(item.type)}</p><p className="mt-1 text-xs text-muted-foreground">{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Kinshasa' }).format(new Date(item.createdAt))} · {item.readAt ? 'Lue' : 'Non lue'}</p></div>
      {item.type === 'service_card' && <a href="/mon-rh/carte-service" className="text-xs font-semibold text-primary underline">Voir ma carte</a>}
      {!item.readAt && <button type="button" disabled={!!busyId} onClick={() => void markRead(item.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Marquer comme lue</button>}
    </article>)}
    {items.length === 100 && <p className="text-xs text-muted-foreground">Les 100 notifications les plus récentes sont affichées.</p>}
    <p className="text-xs text-muted-foreground">Ouvrez la section correspondante pour consulter les détails. Les alertes push ne contiennent jamais de montant ni de motif.</p>
  </section>;
}
