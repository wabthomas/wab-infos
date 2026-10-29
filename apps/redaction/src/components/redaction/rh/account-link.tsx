'use client';
import { useEffect, useState } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import type { Collaborator } from '@/lib/redaction/rh/collaborator';

type Account = { id: number; email: string; username?: string };
const endpoint = '/api/redaction/rh/liaisons';
export function AccountLink({ person, onChanged }: { person: Collaborator; onChanged: () => void }) {
  const [link, setLink] = useState<Account | null>(null);
  const [candidate, setCandidate] = useState<Account | null>(null);
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setLoadFailed(false);
    fetchRedaction(`${endpoint}?${new URLSearchParams({ collaboratorId: person.id })}`, { cache: 'no-store', signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(); const data = await r.json(); setLink(data.link); })
      .catch(() => { if (!controller.signal.aborted) { setLoadFailed(true); setError('Impossible de charger la liaison. Vérifiez la migration RH.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [person.id, person.version]);
  async function search() {
    setBusy(true); setError(''); setCandidate(null);
    try {
      const r = await fetchRedaction(`${endpoint}?${new URLSearchParams({ accountId: id })}`, { cache: 'no-store' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Recherche impossible.');
      setCandidate(data.account);
    } catch (e) { setError(e instanceof Error ? e.message : 'Recherche impossible.'); }
    finally { setBusy(false); }
  }
  async function change(action: 'link' | 'unlink') {
    const text = action === 'link' ? `Lier ${person.firstName} ${person.lastName} au compte ${candidate?.email} ?` : `Retirer l’accès RH du compte ${link?.email} ?`;
    if (!window.confirm(text)) return;
    setBusy(true); setError('');
    try {
      const r = await fetchRedaction(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, collaboratorId: person.id, version: person.version, accountId: String(candidate?.id ?? ''), expectedEmail: candidate?.email }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Modification impossible.');
      setCandidate(null); onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : 'Modification impossible.'); }
    finally { setBusy(false); }
  }
  return <div className="mt-3 space-y-2 rounded-lg bg-muted p-3 text-sm">
    <h4 className="font-semibold">Compte Rédaction lié</h4>
    <p className="text-xs text-muted-foreground">Uniquement les comptes Users &amp; Permissions de Strapi ; les comptes du panneau admin ne sont pas encore pris en charge. Vérifiez l’identité avant de lier.</p>
    {error && <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}
    {loading ? <p>Chargement…</p> : loadFailed ? null : link ? <div>
      <p>Compte #{link.id} · {link.email}</p>
      <button type="button" disabled={busy} onClick={() => void change('unlink')} className="mt-2 text-red-700 underline dark:text-red-300">Retirer la liaison</button>
    </div> : <>
      <label className="block">Identifiant numérique du compte Users &amp; Permissions
        <input type="text" inputMode="numeric" value={id} maxLength={10} onChange={(e) => { setId(e.target.value); setCandidate(null); }} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" />
      </label>
      <button type="button" disabled={busy || !id} onClick={() => void search()} className="font-semibold text-primary underline">Vérifier le compte</button>
      {candidate && <div className="space-y-2"><p>Compte #{candidate.id} · {candidate.username} · {candidate.email}</p>
        <button type="button" disabled={busy} onClick={() => void change('link')} className="rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground">Confirmer la liaison</button></div>}
    </>}
  </div>;
}
