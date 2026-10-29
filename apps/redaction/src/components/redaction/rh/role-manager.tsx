'use client';
import { useEffect, useState } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import type { Collaborator } from '@/lib/redaction/rh/collaborator';
import type { RhRole } from '@/lib/redaction/rh/permissions';

type Grant = { collaboratorId: string; firstName: string; lastName: string; accountId: number; email: string; role: RhRole };
const labels: Record<RhRole, string> = { rh_manager: 'Gestionnaire RH', finance_manager: 'Gestionnaire financier' };
export function RoleManager() {
  const [people, setPeople] = useState<Collaborator[]>([]); const [grants, setGrants] = useState<Grant[]>([]);
  const [person, setPerson] = useState(''); const [role, setRole] = useState<RhRole>('rh_manager');
  const [failed, setFailed] = useState(false);
  const [enabled, setEnabled] = useState(false); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setFailed(false);
    Promise.all([fetchRedaction('/api/redaction/rh/collaborateurs', { cache: 'no-store', signal: controller.signal }), fetchRedaction('/api/redaction/rh/droits', { cache: 'no-store', signal: controller.signal })])
      .then(async ([p, g]) => {
        if (!p.ok || !g.ok) throw new Error();
        const [persons, rights] = await Promise.all([p.json(), g.json()]);
        setPeople(persons.collaborators.filter((entry: Collaborator) => !entry.archived)); setGrants(rights.grants); setEnabled(rights.enabled);
      }).catch(() => { if (!controller.signal.aborted) { setFailed(true); setError('Impossible de charger les droits. Vérifiez la migration RH.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  async function change(collaboratorId: string, selectedRole: RhRole, action: 'grant' | 'revoke') {
    if (!window.confirm(action === 'grant' ? `Attribuer le rôle « ${labels[selectedRole]} » à ce compte ?` : `Retirer le rôle « ${labels[selectedRole]} » ?`)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/droits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ collaboratorId, role: selectedRole, action }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Opération impossible.');
      setMessage(action === 'grant' ? 'Droit attribué.' : 'Droit retiré.'); setReload((n) => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Opération impossible.'); } finally { setBusy(false); }
  }
  return <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
    <div><h3 className="font-semibold">Rôles RH dédiés</h3><p className="mt-1 text-sm text-muted-foreground">Attribuez un rôle uniquement à un collaborateur actif dont le compte a été lié et vérifié.</p></div>
    <p className="rounded-xl bg-amber-500/10 p-3 text-xs leading-5 text-amber-800 dark:text-amber-300">{enabled ? 'Rôles activés par configuration. Les accès doivent être vérifiés avant utilisation réelle.' : 'Les rôles sont désactivés par défaut : les attributions enregistrées ne donnent aucun accès tant que la fonctionnalité n’est pas activée.'}</p>
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-muted/60 p-4 text-xs leading-5"><strong className="block text-sm">Gestionnaire RH</strong>Peut gérer dossiers, prestations et absences. Pas de gestion des comptes, droits ou données financières.</div><div className="rounded-xl bg-muted/60 p-4 text-xs leading-5"><strong className="block text-sm">Gestionnaire financier</strong>Peut consulter l’annuaire professionnel et gérer rémunérations et retraits lorsque ces fonctions sont activées. Pas de gestion des dossiers ou des droits.</div></div>
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}{message && <p role="status" className="text-sm text-primary">{message}</p>}
    {loading ? <p className="text-sm">Chargement…</p> : !failed && <>
      <div className="space-y-2"><h4 className="text-sm font-bold">Attributions actuelles</h4>{grants.length === 0 && <p className="text-sm text-muted-foreground">Aucun rôle RH attribué.</p>}
        {grants.map((grant) => <article key={`${grant.collaboratorId}-${grant.role}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm"><div><p className="font-semibold">{grant.firstName} {grant.lastName} · {labels[grant.role]}</p><p className="text-xs text-muted-foreground">Compte #{grant.accountId} · {grant.email}</p></div><button type="button" disabled={busy} onClick={() => void change(grant.collaboratorId, grant.role, 'revoke')} className="text-xs font-semibold text-red-700 underline dark:text-red-300">Retirer</button></article>)}
        {grants.length === 500 && <p className="text-xs text-muted-foreground">Les 500 premières attributions sont affichées.</p>}
      </div>
      <div className="space-y-3 border-t border-border pt-4"><h4 className="text-sm font-bold">Attribuer un rôle</h4><div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Collaborateur<select value={person} onChange={(e) => setPerson(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"><option value="">Sélectionner…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.team}</option>)}</select></label>
        <label className="text-sm font-medium">Rôle<select value={role} onChange={(e) => setRole(e.target.value as RhRole)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"><option value="rh_manager">Gestionnaire RH</option><option value="finance_manager">Gestionnaire financier</option></select></label></div>
        <button type="button" disabled={busy || !person} onClick={() => void change(person, role, 'grant')} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Attribuer</button>
      </div>
    </>}
  </section>;
}
