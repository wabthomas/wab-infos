'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { Download, FileLock2, Upload } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import type { Collaborator } from '@/lib/redaction/rh/collaborator';
import type { DocumentCategory, DocumentMeta } from '@/lib/redaction/rh/documents';

const categoryLabel: Record<DocumentCategory, string> = { contrat: 'Contrat', attestation: 'Attestation', autre: 'Autre' };
const extensions = { pdf: 'pdf', jpeg: 'jpg', png: 'png' } as const;
async function downloadDocument(path: string, type: DocumentMeta['fileType']) {
  const response = await fetchRedaction(path, { cache: 'no-store' });
  if (!response.ok) throw new Error('Téléchargement impossible ou accès retiré.');
  const url = URL.createObjectURL(await response.blob());
  try { const a = document.createElement('a'); a.href = url; a.download = `document-rh.${extensions[type]}`; document.body.appendChild(a); a.click(); a.remove(); }
  finally { window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
export function Documents({ enabled }: { enabled: boolean }) {
  const [people, setPeople] = useState<Collaborator[]>([]); const [person, setPerson] = useState('');
  const [docs, setDocs] = useState<DocumentMeta[]>([]); const [title, setTitle] = useState(''); const [category, setCategory] = useState<DocumentCategory>('contrat'); const [share, setShare] = useState(false); const [file, setFile] = useState<File | null>(null); const [fileKey, setFileKey] = useState(0);
  const [loading, setLoading] = useState(false); const [failed, setFailed] = useState(false); const [busy, setBusy] = useState(false); const [reload, setReload] = useState(0);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetchRedaction('/api/redaction/rh/collaborateurs', { cache: 'no-store', signal: controller.signal }).then(async (r) => {
      if (!r.ok) throw new Error(); const data = await r.json(); const active = data.collaborators.filter((p: Collaborator) => !p.archived); setPeople(active); setPerson((old) => active.some((p: Collaborator) => p.id === old) ? old : '');
    }).catch(() => { if (!controller.signal.aborted) setError('Impossible de charger les collaborateurs.'); });
    return () => controller.abort();
  }, [enabled, reload]);
  useEffect(() => {
    setDocs([]); setFailed(false);
    if (!enabled || !person) { setLoading(false); return; }
    const controller = new AbortController(); setLoading(true); setError('');
    fetchRedaction(`/api/redaction/rh/documents?${new URLSearchParams({ collaboratorId: person })}`, { cache: 'no-store', signal: controller.signal }).then(async (r) => { if (!r.ok) throw new Error(); const data = await r.json(); setDocs(data.documents); })
      .catch(() => { if (!controller.signal.aborted) { setFailed(true); setError('Impossible de charger les documents. Vérifiez la configuration RH.'); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled, person, reload]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('');
    if (!file || file.size > 5 * 1024 * 1024 || file.size === 0) { setError('Choisissez un fichier de 5 Mo maximum.'); return; }
    setBusy(true);
    try {
      const body = new FormData(); body.set('collaboratorId', person); body.set('title', title); body.set('category', category); body.set('share', share ? 'yes' : 'no'); body.set('file', file);
      const r = await fetchRedaction('/api/redaction/rh/documents', { method: 'POST', body }); const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Dépôt impossible.');
      setTitle(''); setFile(null); setShare(false); setFileKey((n) => n + 1); setMessage('Document enregistré.'); setReload((n) => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Dépôt impossible.'); }
    finally { setBusy(false); }
  }
  async function archive(doc: DocumentMeta) {
    if (!window.confirm('Archiver ce document et retirer son accès ? Le fichier reste conservé dans la base privée.')) return;
    setBusy(true); setError(''); setMessage('');
    try { const r = await fetchRedaction('/api/redaction/rh/documents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: doc.id, version: doc.version, action: 'archive' }) }); const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Archivage impossible.'); setMessage('Document archivé.'); setReload((n) => n + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'Archivage impossible.'); } finally { setBusy(false); }
  }
  async function download(doc: DocumentMeta) { setBusy(true); setError(''); try { await downloadDocument(`/api/redaction/rh/documents/${doc.id}`, doc.fileType); } catch (e) { setError(e instanceof Error ? e.message : 'Téléchargement impossible.'); } finally { setBusy(false); } }
  return <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
    <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/[0.07] text-primary"><FileLock2 className="h-5 w-5" /></span><div><h3 className="font-semibold">Documents privés</h3><p className="mt-1 text-sm text-muted-foreground">Contrats et attestations, hors de la bibliothèque publique du CMS.</p></div></div>
    {!enabled ? <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-muted-foreground">Fonction désactivée par défaut. Configurez le stockage privé et effectuez les vérifications indiquées dans le guide.</p> : <>
      <p className="rounded-xl bg-amber-500/10 p-3 text-xs leading-5 text-muted-foreground">Réservé aux super-administrateurs. Partagez uniquement après vérification de l’identité du compte lié. Pas de données médicales. Les fichiers ne sont pas analysés par antivirus.</p>
      {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}{message && <p role="status" className="text-sm text-primary">{message}</p>}
      <label className="block text-sm font-medium">Collaborateur<select disabled={busy} value={person} onChange={(e) => { setPerson(e.target.value); setMessage(''); }} className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5"><option value="">Sélectionner…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.team}</option>)}</select></label>
      {person && (loading ? <p className="text-sm text-muted-foreground">Chargement…</p> : failed ? null : <>
        <div className="space-y-2">{docs.length === 0 && <p className="text-sm text-muted-foreground">Aucun document disponible.</p>}{docs.map((doc) => <article key={doc.id} className="rounded-xl border border-border p-4 text-sm"><p className="font-semibold">{doc.title}</p><p className="mt-1 text-xs text-muted-foreground">{categoryLabel[doc.category]} · {doc.fileType.toUpperCase()} · {Math.ceil(doc.size / 1024)} Ko</p><p className="mt-1 text-xs text-muted-foreground">{doc.visibleTo ? `Partagé avec ${doc.visibleTo} tant que ce compte reste lié.` : 'Réservé aux super-administrateurs.'}</p><div className="mt-3 flex flex-wrap gap-4"><button type="button" disabled={busy} onClick={() => void download(doc)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline"><Download className="h-3.5 w-3.5" /> Télécharger</button><button type="button" disabled={busy} onClick={() => void archive(doc)} className="text-xs text-red-700 underline dark:text-red-300">Archiver</button></div></article>)}{docs.length === 500 && <p className="text-xs text-muted-foreground">Les 500 documents les plus récents sont affichés.</p>}</div>
        <form onSubmit={submit} className="space-y-3 border-t border-border pt-4"><h4 className="font-semibold">Déposer un document</h4><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Titre<input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2" /></label><label className="block text-sm font-medium">Catégorie<select value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2"><option value="contrat">Contrat</option><option value="attestation">Attestation</option><option value="autre">Autre</option></select></label></div>
          <label className="block text-sm font-medium">Fichier PDF, JPEG ou PNG (5 Mo maximum)<input key={fileKey} type="file" required accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" /></label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="mt-1" /><span>Partager avec le compte actuellement lié à ce dossier.<span className="block text-xs text-muted-foreground">Sans partage, seuls les super-administrateurs peuvent le consulter.</span></span></label>
          <button disabled={busy} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Upload className="h-4 w-4" />{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        </form>
      </>)}
    </>}
  </section>;
}
export function MyDocuments() {
  const [docs, setDocs] = useState<DocumentMeta[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); fetchRedaction('/api/redaction/rh/mon-espace/documents', { cache: 'no-store', signal: controller.signal }).then(async (r) => { if (!r.ok) throw new Error(); const data = await r.json(); setDocs(data.documents); }).catch(() => { if (!controller.signal.aborted) setError('Impossible de charger vos documents.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, []);
  async function download(doc: DocumentMeta) { setBusy(true); setError(''); try { await downloadDocument(`/api/redaction/rh/mon-espace/documents/${doc.id}`, doc.fileType); } catch (e) { setError(e instanceof Error ? e.message : 'Téléchargement impossible.'); } finally { setBusy(false); } }
  return <section className="space-y-3 rounded-xl border border-border bg-card p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.07] text-primary"><FileLock2 className="h-5 w-5" /></span><div><h2 className="font-semibold">Mes documents</h2><p className="text-xs text-muted-foreground">Documents partagés avec votre compte.</p></div></div>
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}{loading ? <p className="text-sm">Chargement…</p> : !error && docs.length === 0 ? <p className="text-sm text-muted-foreground">Aucun document partagé.</p> : null}
    {docs.map((doc) => <article key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm"><div><p className="font-semibold">{doc.title}</p><p className="mt-1 text-xs text-muted-foreground">{categoryLabel[doc.category]} · {doc.fileType.toUpperCase()} · {Math.ceil(doc.size / 1024)} Ko</p></div><button type="button" disabled={busy} onClick={() => void download(doc)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline"><Download className="h-3.5 w-3.5" /> Télécharger</button></article>)}
    {docs.length === 500 && <p className="text-xs text-muted-foreground">Les 500 documents les plus récents sont affichés.</p>}
  </section>;
}
