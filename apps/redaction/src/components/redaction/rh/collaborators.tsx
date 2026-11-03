'use client';
import { useRhNotice } from './use-rh-notice';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Search, UsersRound, Plus, ChevronDown } from 'lucide-react';
import { AccountLink } from './account-link';
import { IdentityAdmin } from './identity-admin';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { RH_JOB_TITLE_SUGGESTIONS, validateCollaborator, type Collaborator, type CollaboratorInput } from '@/lib/redaction/rh/collaborator';

const empty: CollaboratorInput = { firstName: '', lastName: '', jobTitle: '', team: '', contractStatus: '', startDate: '' };
const fields = [
  ['firstName', 'Prénom', 100], ['lastName', 'Nom', 100], ['jobTitle', 'Fonction', 150],
  ['team', 'Équipe', 150], ['contractStatus', 'Statut de collaboration', 100],
] as const;
const endpoint = '/api/redaction/rh/collaborateurs';

export function Collaborators({ allowAccountLinks = true, canManage = true }: { allowAccountLinks?: boolean; canManage?: boolean }) {
  const [rows, setRows] = useState<Collaborator[]>([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<CollaboratorInput>(empty);
  const [formOpen, setFormOpen] = useState(false);
  const [linkPerson, setLinkPerson] = useState<string | null>(null);
  const [actionsPerson, setActionsPerson] = useState<string | null>(null);
  const [editing, setEditing] = useState<Collaborator | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useRhNotice('error');
  const [message, setMessage] = useRhNotice('success');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRedaction(endpoint, { cache: 'no-store' });
      if (!res.ok) throw new Error('Impossible de charger les dossiers. Vérifiez la configuration du service RH.');
      const data = await res.json();
      setRows(data.collaborators);
      setError('');
    } catch { setError('Impossible de charger les dossiers. Vérifiez la configuration du service RH.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function send(method: 'POST' | 'PATCH', body: unknown) {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetchRedaction(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Opération impossible.');
      setForm(empty); setEditing(null); setFormOpen(false);
      await load();
      window.dispatchEvent(new Event('rh-collaborators-changed'));
      setMessage('Dossier enregistré.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Opération impossible.'); }
    finally { setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = validateCollaborator(form);
    if (!input) { setError('Vérifiez les champs et la date.'); return; }
    void send(editing ? 'PATCH' : 'POST', editing ? { action: 'update', id: editing.id, version: editing.version, collaborator: input } : input);
  }

  const filteredRows = rows.filter((row) => [row.firstName, row.lastName, row.jobTitle, row.team, row.contractStatus].join(' ').toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr')));

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-display text-lg font-bold">Annuaire de l’équipe</h2>
          <p className="mt-1 text-sm text-muted-foreground">Dossiers professionnels accessibles aux administrateurs. N’ajoutez pas ici de salaire, document ou donnée personnelle sensible.</p></div>
        {!loading && !error && <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/[0.07] px-3 py-1.5 text-xs font-bold text-primary"><UsersRound className="h-3.5 w-3.5" /> {rows.length}{rows.length === 500 ? '+' : ''} dossier{rows.length !== 1 ? 's' : ''}</span>}
      </div>
      {canManage && <button type="button" aria-expanded={formOpen} onClick={() => { setFormOpen((open) => !open); setEditing(null); setForm(empty); setError(''); }} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4" />Ajouter un collaborateur</button>}
      {formOpen && canManage && <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
        <h3 className="font-semibold">{editing ? 'Modifier un dossier' : 'Ajouter un collaborateur'}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(([key, label, max]) => <label key={key} className="block text-sm font-medium">{label}<input required maxLength={max} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" />{key === 'jobTitle' && <span className="mt-2 flex flex-wrap gap-1.5">{RH_JOB_TITLE_SUGGESTIONS.map((title) => <button key={title} type="button" onClick={() => setForm((current) => ({ ...current, jobTitle: title }))} className="rounded-full border border-border px-2.5 py-1 text-[11px]">{title}</button>)}</span>}</label>)}
          <label className="block text-sm font-medium">Date d’arrivée (facultatif)<input type="date" min="1900-01-01" value={form.startDate || ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
        </div>
        <button disabled={busy} type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Enregistrement...' : 'Enregistrer le dossier'}</button>
      </form>}
      <label className="relative block"><span className="sr-only">Rechercher dans les collaborateurs affichés</span><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un nom, une fonction, une équipe…" className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10" /></label>
      {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
      {message && <p role="status" className="text-sm text-primary">{message}</p>}
      {loading ? <p className="text-sm">Chargement…</p> : (
        <div className="space-y-2">
          {rows.length === 0 && !error && <p className="text-sm text-muted-foreground">Aucun dossier pour le moment.</p>}
          {rows.length > 0 && filteredRows.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Aucun collaborateur ne correspond à cette recherche.</p>}
          {filteredRows.length > 0 && <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-3 rounded-lg bg-muted px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground sm:grid"><span>Collaborateur</span><span>Fonction · équipe</span><span>Statut</span><span>Action</span></div>}
          {filteredRows.map((row) => (
            <article key={row.id} className="rounded-xl border border-border transition-colors hover:border-primary/20">
              <div className="grid gap-2 p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-xs font-bold uppercase text-primary">{row.firstName.slice(0,1)}{row.lastName.slice(0,1)}</span><span className="truncate text-sm font-semibold">{row.firstName} {row.lastName}</span></div>
                <p className="truncate text-xs text-muted-foreground">{row.jobTitle} · {row.team}</p>
                <p className="text-xs text-muted-foreground">{row.archived ? 'Archivé' : row.contractStatus}{row.startDate ? ` · ${row.startDate}` : ''}</p>
                <button type="button" aria-expanded={actionsPerson === row.id} disabled={row.archived} onClick={() => { setActionsPerson(actionsPerson === row.id ? null : row.id); setLinkPerson(null); }} className="inline-flex w-fit items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-50">Actions <ChevronDown className="h-3.5 w-3.5" /></button>
              </div>
              {!row.archived && actionsPerson === row.id && <div className="space-y-3 border-t border-border p-3 sm:px-4">
                <div className="flex flex-wrap gap-3 text-xs">
                  {canManage && <button type="button" disabled={busy} className="font-semibold text-primary underline" onClick={() => { setEditing(row); setFormOpen(true); setForm({ firstName: row.firstName, lastName: row.lastName, jobTitle: row.jobTitle, team: row.team, contractStatus: row.contractStatus, startDate: row.startDate }); setError(''); window.scrollTo({top: 0, behavior: 'smooth'}); }}>Modifier</button>}
                  {canManage && <Link href={`/rh/equipe/${row.id}/fiche`} className="font-semibold text-primary underline">Fiche · PDF</Link>}
                  {allowAccountLinks && <button type="button" className="text-primary underline" onClick={() => setLinkPerson(linkPerson === row.id ? null : row.id)}>Compte</button>}
                  {canManage && <button type="button" disabled={busy} className="text-red-700 underline" onClick={() => { if (window.confirm(`Archiver le dossier de ${row.firstName} ${row.lastName} ? Le compte de connexion ne sera pas modifié.`)) void send('PATCH', { action: 'archive', id: row.id, version: row.version }); }}>Archiver</button>}
                </div>
                {allowAccountLinks && linkPerson === row.id && <AccountLink person={row} onChanged={() => { setLinkPerson(null); void load(); window.dispatchEvent(new Event('rh-collaborators-changed')); }} />}
                {canManage && <IdentityAdmin personId={row.id} personName={`${row.firstName} ${row.lastName}`} />}
              </div>}
            </article>
          ))}
          {rows.length === 500 && <p className="text-xs text-muted-foreground">Les 500 premiers dossiers sont affichés ; la recherche porte uniquement sur ces dossiers.</p>}
        </div>
      )}
    </section>
  );
}
