'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, PenLine, Plus, Star, StarOff, Upload } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { readApiJsonResponse } from '@/lib/redaction/api-response';
import { useToast } from '@/components/ui/toast';

type Signatory = {
  id: string;
  fullName: string;
  title: string;
  active: boolean;
  isDefault: boolean;
  hasSignature: boolean;
  version: number;
  updatedAt: string;
};

const inputClass = 'mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';

export function SignatoriesSettings() {
  const toast = useToast();
  const [items, setItems] = useState<Signatory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('Directeur Général');
  const [isDefault, setIsDefault] = useState(false);
  const [signature, setSignature] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function reload() {
    try {
      const response = await fetchRedaction('/api/redaction/rh/signataires', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Liste indisponible.');
      setItems(data.signatories ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Liste indisponible.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void reload(); }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!fullName.trim() || !title.trim()) { setError('Nom et fonction requis.'); return; }
    setBusy('create'); setError('');
    try {
      const form = new FormData();
      form.set('fullName', fullName.trim());
      form.set('title', title.trim());
      form.set('isDefault', isDefault ? 'true' : 'false');
      if (signature) form.set('signature', signature);
      const response = await fetchRedaction('/api/redaction/rh/signataires', { method: 'POST', body: form });
      const data = await readApiJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error || 'Ajout impossible.');
      setFullName(''); setTitle('Directeur Général'); setSignature(null); setIsDefault(false);
      if (fileInput.current) fileInput.current.value = '';
      await reload();
      toast.success('Signataire ajouté', 'Il peut être activé ou défini par défaut.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ajout impossible.'); }
    finally { setBusy(''); }
  }

  async function patch(item: Signatory, changes: Partial<Pick<Signatory, 'active' | 'isDefault'>>, label: string) {
    setBusy(item.id); setError('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/signataires', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, version: item.version, fullName: item.fullName, title: item.title, active: changes.active ?? item.active, isDefault: changes.isDefault ?? item.isDefault }),
      });
      const data = await readApiJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error || 'Mise à jour impossible.');
      await reload();
      toast.success(label);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Mise à jour impossible.'); }
    finally { setBusy(''); }
  }

  async function replaceSignature(item: Signatory, file: File | null) {
    if (!file) return;
    setBusy(item.id); setError('');
    try {
      const form = new FormData();
      form.set('version', String(item.version));
      form.set('signature', file);
      const response = await fetchRedaction(`/api/redaction/rh/signataires/${encodeURIComponent(item.id)}/signature`, { method: 'POST', body: form });
      const data = await readApiJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error || 'Signature non enregistrée.');
      await reload();
      toast.success('Signature mise à jour');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Signature non enregistrée.'); }
    finally { setBusy(''); }
  }

  return <section className="space-y-4 rounded-xl border border-border bg-card p-5">
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><PenLine className="h-5 w-5" /></span>
      <div>
        <h2 className="font-display text-lg font-bold">Signataires des documents</h2>
        <p className="mt-1 text-sm text-muted-foreground">Le signataire <strong>actif par défaut</strong> est utilisé automatiquement sur les contrats, attestations, reçus, cartes et courriers RH. Exemple : Directeur Général ou Directeur des Ressources humaines.</p>
      </div>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {loading ? <p className="text-sm text-muted-foreground"><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />Chargement…</p> : <>
      <div className="space-y-2">
        {!items.length && <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Aucun signataire. Ajoutez le premier ci-dessous.</p>}
        {items.map((item) => <article key={item.id} className={`rounded-xl border p-3 ${item.active ? 'border-border bg-background' : 'border-dashed bg-muted/30 opacity-80'}`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid h-16 w-28 shrink-0 place-items-center overflow-hidden rounded-lg border bg-white">
              {item.hasSignature ? <img src={`/api/redaction/rh/signataires/${encodeURIComponent(item.id)}/signature?v=${item.version}`} alt={`Signature de ${item.fullName}`} className="max-h-16 max-w-28 object-contain" /> : <span className="px-2 text-center text-[10px] text-muted-foreground">Aucune signature</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{item.fullName}</p>
              <p className="text-xs text-muted-foreground">{item.title}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {item.isDefault && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3 w-3" />Signataire par défaut</span>}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{item.active ? 'Actif' : 'Désactivé'}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy === item.id} onClick={() => void patch(item, { active: !item.active }, item.active ? 'Signataire désactivé' : 'Signataire activé')} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50">{item.active ? 'Désactiver' : 'Activer'}</button>
              <button type="button" disabled={busy === item.id || !item.active || item.isDefault} onClick={() => void patch(item, { isDefault: true }, 'Signataire par défaut mis à jour')} className="inline-flex items-center gap-1 rounded-lg border border-primary/40 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-40">{item.isDefault ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5" />}Par défaut</button>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold">
                <Upload className="h-3.5 w-3.5" />{item.hasSignature ? 'Remplacer' : 'Ajouter'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy === item.id} onChange={(event) => { void replaceSignature(item, event.target.files?.[0] ?? null); event.currentTarget.value = ''; }} />
              </label>
            </div>
          </div>
        </article>)}
      </div>
      <form onSubmit={create} className="rounded-xl border border-dashed border-primary/40 bg-primary/[0.03] p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold"><Plus className="h-4 w-4 text-primary" />Ajouter un signataire</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Nom complet<input required maxLength={160} value={fullName} onChange={(event) => setFullName(event.target.value)} className={inputClass} placeholder="Nom et prénom" /></label>
          <label className="text-sm font-medium">Fonction<input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} placeholder="Directeur Général / Directeur des RH" /></label>
          <label className="text-sm font-medium sm:col-span-2">Signature (PNG/JPG/WebP, 1,5 Mo max)<input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setSignature(event.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" /></label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />Définir comme signataire par défaut</label>
        <button type="submit" disabled={busy === 'create'} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Ajouter le signataire</button>
      </form>
    </>}
  </section>;
}
