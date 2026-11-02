'use client';
import { useRhNotice } from './use-rh-notice';
import { useEffect, useState } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { pending, remove, notifyQueue } from '@/lib/redaction/rh/offline-queue';

let syncing = false;
export function RhOfflineSync({ owner }: { owner: string }) {
  const [count, setCount] = useState(0);
  const [error, setError] = useRhNotice('error');
  useEffect(() => {
    let live = true;
    async function sync() {
      if (syncing) return;
      syncing = true;
      try {
        const list = await pending(owner);
        if (live) setCount(list.length);
        for (const op of list) {
          if (!navigator.onLine) break;
          const endpoint = op.kind === 'prestation' ? '/api/redaction/rh/mon-espace/prestations' : op.kind === 'absence' ? '/api/redaction/rh/mon-espace' : '/api/redaction/rh/mon-espace/presence';
          let response: Response;
          try {
            response = await fetchRedaction(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(op.kind === 'prestation' ? { date: op.date, description: op.description, clientId: op.id, recordedAt: op.recordedAt } : op.kind === 'absence' ? { startDate: op.startDate, endDate: op.endDate, category: op.category, clientId: op.id, recordedAt: op.recordedAt } : { action: op.kind, recordedAt: op.recordedAt }) });
          } catch { break; }
          if (!response.ok) {
            if (live) setError(`Envoi bloqué pour ${op.kind} du ${new Date(op.recordedAt).toLocaleString('fr-FR')} (${response.status}). Vérifiez le compte et la saisie ; les données restent sur cet appareil.`);
            break;
          }
          await remove(op.id);
          notifyQueue();
          if (live) { setCount((n) => Math.max(0, n - 1)); setError(''); }
        }
      } catch { if (live) setError('Stockage local indisponible : synchronisation impossible.'); }
      finally { syncing = false; }
    }
    try { localStorage.setItem('redaction-offline-owner', owner); } catch {}
    void sync();
    window.addEventListener('online', sync);
    window.addEventListener('rh-offline-queue', sync);
    const timer = window.setInterval(sync, 30_000);
    return () => { live = false; window.removeEventListener('online', sync); window.removeEventListener('rh-offline-queue', sync); window.clearInterval(timer); };
  }, [owner]);
  return count || error ? <div role="status" className="fixed bottom-20 left-4 right-4 z-[100] rounded-xl border border-amber-500 bg-background p-3 text-sm shadow-lg sm:left-auto sm:max-w-sm">{count} opération(s) RH en attente d’envoi. {error}<button type="button" className="ml-2 underline" onClick={notifyQueue}>Réessayer</button></div> : null;
}
