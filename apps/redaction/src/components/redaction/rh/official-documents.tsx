'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Archive, Check, FilePenLine, FileText, Megaphone, Plus, Search, Sparkles, X } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { DEFAULT_ORGANIZATION_SETTINGS, type OrganizationSettings } from '@/lib/redaction/rh/organization';
import { OFFICIAL_KINDS, type OfficialDocumentKind, type OfficialTemplate } from '@/lib/redaction/rh/official-documents';
import { downloadCanvas, downloadOfficialPdf, renderOfficialPage, OfficialPageOverflowError, type OfficialExport } from '@/lib/redaction/rh/official-export';

const base = '/api/redaction/rh';
const assetKeys = ['company-logo','document-header','document-footer','director-signature'] as const;
type Assets = OfficialExport['assets'];
const emptyAssets: Assets = { 'company-logo': null, 'document-header': null, 'document-footer': null, 'director-signature': null };

export function OfficialDocuments() {
  const toast = useToast();
  const [templates, setTemplates] = useState<OfficialTemplate[]>([]);
  const [selected, setSelected] = useState<OfficialTemplate | null>(null);
  const [title, setTitle] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateFilter, setTemplateFilter] = useState<'tous' | OfficialDocumentKind>('tous');
  const [pendingChoice, setPendingChoice] = useState<OfficialTemplate | null | undefined>(undefined);
  const [archivePrompt, setArchivePrompt] = useState(false);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [kind, setKind] = useState<OfficialDocumentKind>('lettre');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [instructions, setInstructions] = useState('');
  const [recipient, setRecipient] = useState('');
  const [date, setDate] = useState(() => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date()));
  const [signed, setSigned] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'texte' | 'image'>('texte');
  const [settings, setSettings] = useState<OrganizationSettings>(DEFAULT_ORGANIZATION_SETTINGS);
  const [assets, setAssets] = useState<Assets>(emptyAssets);
  const [busy, setBusy] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [overflow, setOverflow] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoadingTemplates(true); setLoadError('');
    async function load() {
      try {
        const [list, org, ...images] = await Promise.all([
          fetchRedaction(`${base}/modeles`, { cache: 'no-store' }),
          fetchRedaction(`${base}/organisation`, { cache: 'no-store' }),
          ...assetKeys.map(key => fetchRedaction(`${base}/organisation/assets/${key}`, { cache: 'no-store' })),
        ]);
        if (!list.ok || !org.ok || images.some(r => !r.ok)) throw new Error('Impossible de charger les modèles ou l’identité visuelle.');
        const [listData, orgData, ...imageData] = await Promise.all([list, org, ...images].map(r => r.json()));
        if (active) {
          setTemplates(listData.templates);
          setSettings({ ...DEFAULT_ORGANIZATION_SETTINGS, ...orgData.settings });
          setAssets(Object.fromEntries(assetKeys.map((key, i) => [key, imageData[i].asset || null])) as Assets);
        }
      } catch (cause) { if (active) setLoadError(cause instanceof Error ? cause.message : 'Chargement impossible.'); }
      finally { if (active) setLoadingTemplates(false); }
    }
    void load(); return () => { active = false; };
  }, [refreshKey]);

  function edit(field: 'subject' | 'body' | 'recipient' | 'date' | 'kind', value: string) {
    setSigned(false); setError('');
    if (field === 'subject') setSubject(value);
    if (field === 'body') setBody(value);
    if (field === 'recipient') setRecipient(value);
    if (field === 'date') setDate(value);
    if (field === 'kind') setKind(value as OfficialDocumentKind);
  }
  function choose(template: OfficialTemplate) {
    setSelected(template); setTitle(template.title); setKind(template.kind);
    setSubject(template.subject); setBody(template.body); setSigned(false);
    setError('');
  }
  function reset() { setSelected(null); setTitle(''); setSubject(''); setBody(''); setSigned(false); setError(''); }
  function switchTemplate(template: OfficialTemplate | null) {
    if (template && selected?.id === template.id) return;
    if (!template && !selected && !title.trim() && !subject.trim() && !body.trim()) return;
    const hasDraftChanges = selected
      ? title !== selected.title || kind !== selected.kind || subject !== selected.subject || body !== selected.body
      : Boolean(title.trim() || subject.trim() || body.trim());
    if (hasDraftChanges) { setPendingChoice(template); return; }
    if (template) choose(template); else reset();
  }
  function confirmSwitch() {
    if (pendingChoice === undefined) return;
    if (pendingChoice) choose(pendingChoice); else reset();
    setPendingChoice(undefined);
  }
  async function request(path: string, method: string, data: object) {
    const response = await fetchRedaction(`${base}/${path}`, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Opération impossible.');
    return result;
  }
  async function save() {
    setBusy('save'); setError('');
    try {
      const result = await request('modeles', selected ? 'PATCH' : 'POST', { ...(selected ? { id: selected.id, version: selected.version, action: 'update' } : {}), title, kind, subject, body });
      setSelected(result.template);
      setTemplates(current => [result.template, ...current.filter(item => item.id !== result.template.id)]);
      toast.success('Modèle enregistré.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erreur.'); toast.error('Enregistrement impossible.'); }
    finally { setBusy(''); }
  }
  async function archive() {
    if (!selected) return;
    setBusy('archive'); setError('');
    try {
      await request('modeles', 'PATCH', { action: 'archive', id: selected.id, version: selected.version });
      setTemplates(current => current.filter(item => item.id !== selected.id)); reset(); setArchivePrompt(false); toast.success('Modèle archivé.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erreur.'); toast.error('Archivage impossible.'); }
    finally { setBusy(''); }
  }
  async function generate() {
    setBusy('ai'); setError(''); setSigned(false);
    try {
      const result = await request('rediger', 'POST', { kind, subject, templateBody: body, instructions });
      setSubject(result.draft.subject); setBody(result.draft.body);
      toast.success('Brouillon proposé : relisez avant de signer.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erreur.'); toast.error('Rédaction IA impossible.'); }
    finally { setBusy(''); }
  }
  function documentData(): OfficialExport { return { kind, subject: subject.trim(), body: body.trim(), recipient: recipient.trim(), date: date.trim(), signed, signatureMode, settings, assets }; }
  async function exportFile(type: 'pdf' | 'png') {
    if (!subject.trim() || !body.trim()) { setError('Complétez l’objet et le corps avant l’export.'); return; }
    setBusy(type); setError('');
    try {
      const page = await renderOfficialPage(documentData());
      setOverflow(false);
      const filename = `${kind}-${new Date().toISOString().slice(0, 10)}`;
      if (type === 'pdf') await downloadOfficialPdf(page, `${filename}.pdf`);
      else downloadCanvas(page, `${filename}-300dpi.png`);
    } catch (cause) {
      const message = cause instanceof OfficialPageOverflowError ? cause.message : 'Export impossible sur cet appareil.';
      setError(message); setOverflow(cause instanceof OfficialPageOverflowError); toast.error(message);
    }
    finally { setBusy(''); }
  }
  useEffect(() => {
    let active = true;
    setPreview(null);
    const timer = window.setTimeout(() => {
      void renderOfficialPage(documentData(), 1).then(canvas => {
        if (!active) return;
        setPreview(canvas.toDataURL('image/jpeg', 0.85)); setOverflow(false);
      }).catch(cause => {
        if (!active) return;
        setPreview(null); setOverflow(cause instanceof OfficialPageOverflowError);
      });
    }, 350);
    return () => { active = false; window.clearTimeout(timer); };
  }, [kind, subject, body, recipient, date, signed, signatureMode, settings, assets]);

  async function printDocument() {
    if (!subject.trim() || !body.trim()) { setError('Complétez l’objet et le corps avant l’impression.'); return; }
    setBusy('print'); setError('');
    try {
      const canvas = await renderOfficialPage(documentData(), 1.5);
      const url = canvas.toDataURL('image/jpeg', 0.9);
      await new Promise<void>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(); img.onerror = () => reject(new Error('Aperçu indisponible.')); img.src = url; });
      flushSync(() => { setPreview(url); setOverflow(false); });
      window.print();
    } catch (cause) {
      setError(cause instanceof OfficialPageOverflowError ? cause.message : 'Impression impossible sur cet appareil.');
      setOverflow(cause instanceof OfficialPageOverflowError);
    } finally { setBusy(''); }
  }
  useEffect(() => {
    if (pendingChoice === undefined && !archivePrompt) return;
    dialogCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setPendingChoice(undefined); setArchivePrompt(false); }
      if (event.key !== 'Tab') return;
      const actions = document.querySelectorAll<HTMLElement>('[data-official-dialog-action]');
      const first = actions[0], last = actions[actions.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingChoice, archivePrompt]);

  const normalizedSearch = templateSearch.trim().toLocaleLowerCase('fr');
  const filteredTemplates = templates.filter(item =>
    (templateFilter === 'tous' || item.kind === templateFilter)
    && (!normalizedSearch || `${item.title} ${item.subject}`.toLocaleLowerCase('fr').includes(normalizedSearch))
  );
  const canSign = Boolean(settings.directorName.trim() && (signatureMode === 'texte' || assets['director-signature']));
  const input = 'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary';
  const button = 'rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50';
  return <div className="space-y-5">
    <section className="no-print overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm" aria-labelledby="official-template-title">
      <div className="relative overflow-hidden bg-[#191923] px-5 py-6 text-white sm:px-7 sm:py-7">
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-rose-500/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-rose-200"><FilePenLine className="h-3.5 w-3.5" /> Atelier de correspondance</span>
            <h2 id="official-template-title" className="mt-3 font-display text-xl font-bold tracking-tight sm:text-2xl">Vos modèles officiels<span className="text-rose-400">.</span></h2>
            <p className="mt-1.5 text-sm leading-6 text-zinc-300">Retrouvez une trame, adaptez-la avec l’Assistant RH, puis validez votre document sur une seule page A4.</p>
          </div>
          <button type="button" onClick={() => switchTemplate(null)} disabled={!!busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"><Plus className="h-4 w-4" /> Nouveau modèle</button>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2 text-[11px] font-semibold text-zinc-200"><span className="rounded-full border border-white/15 px-3 py-1.5">01 · Choisir une trame</span><span className="rounded-full border border-white/15 px-3 py-1.5">02 · Rédiger et relire</span><span className="rounded-full border border-white/15 px-3 py-1.5">03 · Exporter en A4</span></div>
      </div>
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="text-sm font-bold">Bibliothèque des modèles</h3><p className="mt-0.5 text-sm text-muted-foreground">{templates.length} modèle{templates.length > 1 ? 's' : ''} enregistré{templates.length > 1 ? 's' : ''} · Accès RH privé</p></div>
          <label className="relative block w-full sm:max-w-64"><span className="sr-only">Rechercher un modèle</span><Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input className={input + ' pl-9'} type="search" value={templateSearch} onChange={event => setTemplateSearch(event.target.value)} placeholder="Rechercher un modèle…" /></label>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les modèles">
          {([['tous', 'Tous'], ['lettre', 'Lettres'], ['communique', 'Communiqués']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={templateFilter === value} onClick={() => setTemplateFilter(value)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${templateFilter === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>{label}</button>)}
        </div>
        {loadingTemplates ? <div role="status" className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl border border-border bg-muted/50" />)}</div> : loadError ? <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><p className="font-semibold">Bibliothèque indisponible</p><p className="mt-1 text-muted-foreground">{loadError}</p><button type="button" className={button + ' mt-3'} onClick={() => setRefreshKey(value => value + 1)}>Réessayer</button></div> : filteredTemplates.length ? <div className="grid max-h-[22rem] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3" role="group" aria-label="Modèles disponibles">
          {filteredTemplates.map(item => {
            const active = selected?.id === item.id;
            const Icon = item.kind === 'lettre' ? FileText : Megaphone;
            return <button type="button" key={item.id} aria-pressed={active} disabled={!!busy} onClick={() => switchTemplate(item)} className={`group flex min-h-32 flex-col rounded-2xl border p-4 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 ${active ? 'border-primary/60 bg-primary/[0.08] ring-2 ring-primary/15' : 'border-border bg-background hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md'}`}>
              <span className="flex w-full items-start justify-between gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-primary text-primary-foreground' : 'bg-primary/[0.08] text-primary'}`}><Icon className="h-4 w-4" /></span>{active && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary"><Check className="h-3.5 w-3.5" /> Sélectionné</span>}</span>
              <span className="mt-3 line-clamp-2 text-base font-bold leading-snug">{item.title}</span><span className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.subject}</span><span className="mt-auto pt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{OFFICIAL_KINDS[item.kind]} · v{item.version}</span>
            </button>;
          })}
        </div> : <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-8 text-center"><FileText className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-2 text-sm font-semibold">{templates.length ? 'Aucun modèle ne correspond à votre recherche.' : 'Votre bibliothèque est encore vide.'}</p><p className="mt-1 text-xs text-muted-foreground">{templates.length ? 'Essayez un autre mot-clé ou filtre.' : 'Créez votre premier modèle pour réutiliser vos lettres et communiqués.'}</p></div>}
        <div className="rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-bold">{selected ? 'Modifier le modèle sélectionné' : 'Créer un modèle'}</h3><p className="mt-0.5 text-sm text-muted-foreground">Le nom, l’objet et le texte du document seront enregistrés dans votre bibliothèque.</p></div>{selected && <span className="rounded-full border border-primary/20 bg-primary/[0.08] px-2.5 py-1 text-[11px] font-semibold text-primary">Version {selected.version}</span>}</div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="text-sm font-medium">Nom du modèle<input className={input + ' mt-1'} maxLength={120} value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex. Convocation à une réunion" /></label>
            <label className="text-sm font-medium">Type<select className={input + ' mt-1'} value={kind} onChange={event => edit('kind', event.target.value)}><option value="lettre">Lettre administrative</option><option value="communique">Communiqué</option></select></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><button className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50" disabled={!!busy || !title.trim() || !subject.trim() || !body.trim()} type="button" onClick={() => void save()}><Check className="h-4 w-4" />{busy === 'save' ? 'Enregistrement…' : selected ? 'Mettre à jour le modèle' : 'Enregistrer le modèle'}</button>{selected && <button className={button + ' inline-flex items-center gap-2'} disabled={!!busy} type="button" onClick={() => setArchivePrompt(true)}><Archive className="h-4 w-4" /> Archiver</button>}</div>
          <p className="mt-3 text-sm text-muted-foreground">Le contenu se renseigne dans « Rédaction et validation » ci-dessous. Un modèle enregistré reste modifiable avant chaque export.</p>
        </div>
      </div>
    </section>

    <div className="no-print rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5 text-primary" /> Assistant RH IA</h2>
      <p className="mb-3 text-sm text-muted-foreground">Indiquez le contexte, le ton et les informations à inclure. L’IA propose un brouillon sans signature ; vérifiez les faits avant tout export.</p>
      <label className="text-sm font-medium">Consignes de rédaction<textarea className={input + ' mt-1 min-h-28'} value={instructions} maxLength={2000} onChange={event => setInstructions(event.target.value)} placeholder="Rédigez une lettre formelle annonçant…" /></label>
      <button type="button" className={button + ' mt-3'} disabled={!!busy || !instructions.trim()} onClick={() => void generate()}>{busy === 'ai' ? 'Rédaction en cours…' : 'Rédiger avec l’Assistant RH IA'}</button>
    </div>

    <div className="no-print rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">Rédaction et validation</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Date et lieu<input className={input + ' mt-1'} value={date} maxLength={150} onChange={event => edit('date', event.target.value)} /></label>
        {kind === 'lettre' && <label className="text-sm font-medium">Destinataire<input className={input + ' mt-1'} value={recipient} maxLength={200} onChange={event => edit('recipient', event.target.value)} placeholder="À l’attention de…" /></label>}
      </div>
      <label className="mt-3 block text-sm font-medium">Objet<input className={input + ' mt-1'} maxLength={200} value={subject} onChange={event => edit('subject', event.target.value)} /></label>
      <label className="mt-3 block text-sm font-medium">Corps du document<textarea className={input + ' mt-1 min-h-64'} maxLength={4000} value={body} onChange={event => edit('body', event.target.value)} /></label>
      <div className="mt-4 rounded-xl bg-muted/60 p-4 text-sm">
        <p className="font-semibold">Visa du Directeur général</p>
        <p className="text-muted-foreground">Signature visuelle (texte ou image), non cryptographique. Vérifiez le texte et l’identité du signataire avant de l’apposer.</p>
        <select className={input + ' mt-3 max-w-xs'} aria-label="Mode de signature" value={signatureMode} onChange={event => { setSignatureMode(event.target.value as 'texte' | 'image'); setSigned(false); }}><option value="texte">Signature en texte</option><option value="image">Image de signature enregistrée</option></select>
        {!canSign && <p className="mt-2 text-red-600">Configurez le nom du DG{signatureMode === 'image' ? ' et son image de signature' : ''} dans Paramètres RH → Entreprise.</p>}
        <label className="mt-3 flex items-center gap-2 font-medium"><input type="checkbox" checked={signed} disabled={!canSign || !subject.trim() || !body.trim()} onChange={event => setSigned(event.target.checked)} /> J’ai relu et j’autorise l’apposition de la signature</label>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      <p className="mt-3 text-sm text-muted-foreground">Une seule page A4 pour chaque lettre ou communiqué. La taille du texte s’adapte légèrement ; si cela ne suffit pas, raccourcissez le document avant l’export.</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className={button} disabled={!!busy} type="button" onClick={() => void exportFile('pdf')}>Télécharger PDF</button>
        <button className={button} disabled={!!busy} type="button" onClick={() => void exportFile('png')}>Télécharger PNG HD (300 dpi)</button>
        <button className={button} disabled={!!busy} type="button" onClick={() => void printDocument()}>Imprimer</button>
      </div>
    </div>

    {overflow && <p role="alert" className="no-print rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">Le document ne tient pas sur une seule page A4 lisible. Raccourcissez le texte ou l’entête ; aucun contenu ne sera tronqué à l’export ou à l’impression.</p>}
    {preview ? <img className="official-print-page mx-auto block h-auto w-full max-w-[210mm] bg-white shadow-lg ring-1 ring-black/10 print:shadow-none print:ring-0" src={preview} alt="Aperçu exact du document officiel sur une page A4" /> : <div className="no-print mx-auto flex aspect-[210/297] max-w-[210mm] items-center justify-center rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">{overflow ? 'Document trop long : réduisez son contenu pour afficher l’aperçu.' : 'Préparation de l’aperçu A4…'}</div>}
    {pendingChoice !== undefined && <div className="no-print fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setPendingChoice(undefined); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="switch-template-title" aria-describedby="switch-template-description" className="w-full max-w-md rounded-[1.75rem] border border-border bg-card p-6 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600"><FilePenLine className="h-5 w-5" /></span><button ref={dialogCloseRef} data-official-dialog-action type="button" aria-label="Fermer" onClick={() => setPendingChoice(undefined)} className="rounded-full p-2 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button></div>
        <h2 id="switch-template-title" className="mt-4 text-xl font-bold">Quitter ce brouillon ?</h2><p id="switch-template-description" className="mt-2 text-sm leading-6 text-muted-foreground">Vos modifications non enregistrées seront perdues. Enregistrez d’abord votre modèle si vous souhaitez les conserver.</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2"><button data-official-dialog-action type="button" className={button} onClick={() => setPendingChoice(undefined)}>Continuer la rédaction</button><button data-official-dialog-action type="button" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={confirmSwitch}>Changer de modèle</button></div>
      </section>
    </div>}
    {archivePrompt && selected && <div className="no-print fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setArchivePrompt(false); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="archive-template-title" aria-describedby="archive-template-description" className="w-full max-w-md rounded-[1.75rem] border border-border bg-card p-6 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600"><Archive className="h-5 w-5" /></span><button ref={dialogCloseRef} data-official-dialog-action type="button" aria-label="Fermer" onClick={() => setArchivePrompt(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button></div>
        <h2 id="archive-template-title" className="mt-4 text-xl font-bold">Archiver ce modèle ?</h2><p id="archive-template-description" className="mt-2 text-sm leading-6 text-muted-foreground">« {selected.title} » quittera la bibliothèque des modèles actifs. Le document affiché sera également effacé de l’éditeur.</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2"><button data-official-dialog-action type="button" className={button} onClick={() => setArchivePrompt(false)}>Annuler</button><button data-official-dialog-action type="button" disabled={!!busy} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void archive()}>Archiver le modèle</button></div>
      </section>
    </div>}
    <style jsx global>{`@media print { @page { size: A4; margin: 0; } html, body { height: 297mm !important; overflow: hidden !important; } body * { visibility: hidden !important; } .official-print-page { visibility: visible !important; position: fixed !important; left: 0 !important; top: 0 !important; width: 210mm !important; height: 297mm !important; max-width: none !important; margin: 0 !important; } }`}</style>
  </div>;
}
