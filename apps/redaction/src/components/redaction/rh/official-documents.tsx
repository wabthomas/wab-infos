'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { DEFAULT_ORGANIZATION_SETTINGS, type OrganizationSettings } from '@/lib/redaction/rh/organization';
import { OFFICIAL_KINDS, type OfficialDocumentKind, type OfficialTemplate } from '@/lib/redaction/rh/official-documents';
import { downloadCanvas, downloadOfficialPdf, renderOfficialPages, type OfficialExport } from '@/lib/redaction/rh/official-export';

const base = '/api/redaction/rh';
const assetKeys = ['company-logo','document-header','document-footer','director-signature'] as const;
type Assets = OfficialExport['assets'];
const emptyAssets: Assets = { 'company-logo': null, 'document-header': null, 'document-footer': null, 'director-signature': null };

export function OfficialDocuments() {
  const toast = useToast();
  const [templates, setTemplates] = useState<OfficialTemplate[]>([]);
  const [selected, setSelected] = useState<OfficialTemplate | null>(null);
  const [title, setTitle] = useState('');
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
  const [pngPage, setPngPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
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
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Chargement impossible.'); }
    }
    void load(); return () => { active = false; };
  }, []);

  function edit(field: 'subject' | 'body' | 'recipient' | 'date' | 'kind', value: string) {
    setSigned(false); setPageCount(1); setPngPage(1); setError('');
    if (field === 'subject') setSubject(value);
    if (field === 'body') setBody(value);
    if (field === 'recipient') setRecipient(value);
    if (field === 'date') setDate(value);
    if (field === 'kind') setKind(value as OfficialDocumentKind);
  }
  function choose(template: OfficialTemplate) {
    setSelected(template); setTitle(template.title); setKind(template.kind);
    setSubject(template.subject); setBody(template.body); setSigned(false); setPageCount(1); setPngPage(1);
    setError('');
  }
  function reset() { setSelected(null); setTitle(''); setSubject(''); setBody(''); setSigned(false); setError(''); }
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
    if (!selected || !window.confirm(`Archiver le modèle « ${selected.title} » ?`)) return;
    setBusy('archive'); setError('');
    try {
      await request('modeles', 'PATCH', { action: 'archive', id: selected.id, version: selected.version });
      setTemplates(current => current.filter(item => item.id !== selected.id)); reset(); toast.success('Modèle archivé.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erreur.'); toast.error('Archivage impossible.'); }
    finally { setBusy(''); }
  }
  async function generate() {
    setBusy('ai'); setError(''); setSigned(false);
    try {
      const result = await request('rediger', 'POST', { kind, subject, templateBody: body, instructions });
      setSubject(result.draft.subject); setBody(result.draft.body); setPageCount(1); setPngPage(1);
      toast.success('Brouillon proposé : relisez avant de signer.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erreur.'); toast.error('Rédaction IA impossible.'); }
    finally { setBusy(''); }
  }
  function documentData(): OfficialExport { return { kind, subject: subject.trim(), body: body.trim(), recipient: recipient.trim(), date: date.trim(), signed, signatureMode, settings, assets }; }
  async function exportFile(type: 'pdf' | 'png') {
    if (!subject.trim() || !body.trim()) { setError('Complétez l’objet et le corps avant l’export.'); return; }
    setBusy(type); setError('');
    try {
      const pages = await renderOfficialPages(documentData());
      setPageCount(pages.length);
      const filename = `${kind}-${new Date().toISOString().slice(0, 10)}`;
      if (type === 'pdf') await downloadOfficialPdf(pages, `${filename}.pdf`);
      else {
        const index = Math.min(Math.max(pngPage - 1, 0), pages.length - 1);
        downloadCanvas(pages[index], `${filename}-page-${index + 1}-sur-${pages.length}-300dpi.png`);
        if (pages.length > 1) toast.success(`${pages.length} pages : choisissez chaque page pour télécharger tous les PNG.`);
      }
    } catch { setError('Export impossible sur cet appareil.'); toast.error('Export impossible.'); }
    finally { setBusy(''); }
  }
  const canSign = Boolean(settings.directorName.trim() && (signatureMode === 'texte' || assets['director-signature']));
  const input = 'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary';
  const button = 'rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50';
  return <div className="space-y-5">
    <div className="no-print rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-bold">Modèles de correspondance</h2>
      <p className="mb-4 text-sm text-muted-foreground">Créez, modifiez et archivez des modèles RH privés. Le brouillon reste modifiable après utilisation d’un modèle.</p>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Choisir un modèle" className={input + ' max-w-sm'} value={selected?.id || ''} onChange={event => { const item = templates.find(t => t.id === event.target.value); if (item) choose(item); else reset(); }}>
          <option value="">Nouveau modèle</option>{templates.map(item => <option key={item.id} value={item.id}>{item.title} — {OFFICIAL_KINDS[item.kind]}</option>)}
        </select>
        <button className={button} type="button" onClick={reset}>Nouveau</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="text-sm font-medium">Nom du modèle<input className={input + ' mt-1'} maxLength={120} value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex. Convocation à une réunion" /></label>
        <label className="text-sm font-medium">Type<select className={input + ' mt-1'} value={kind} onChange={event => edit('kind', event.target.value)}><option value="lettre">Lettre administrative</option><option value="communique">Communiqué</option></select></label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2"><button className={button} disabled={!!busy} type="button" onClick={() => void save()}>{selected ? 'Mettre à jour le modèle' : 'Enregistrer le modèle'}</button>{selected && <button className={button} disabled={!!busy} type="button" onClick={() => void archive()}>Archiver</button>}</div>
    </div>

    <div className="no-print rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-bold">Assistant RH IA</h2>
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
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className={button} disabled={!!busy} type="button" onClick={() => void exportFile('pdf')}>Télécharger PDF</button>
        <button className={button} disabled={!!busy} type="button" onClick={() => void exportFile('png')}>Télécharger PNG HD (300 dpi)</button>
        {pageCount > 1 && <label className="text-sm">Page PNG <select className={input + ' ml-2 w-20'} value={pngPage} onChange={event => setPngPage(Number(event.target.value))}>{Array.from({ length: pageCount }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select> / {pageCount}</label>}
        <button className={button} type="button" onClick={() => window.print()}>Imprimer</button>
      </div>
    </div>

    <div className="official-print-page mx-auto max-w-[210mm] bg-white p-[14mm] text-[#242424] shadow-lg ring-1 ring-black/10 print:max-w-none print:p-0 print:shadow-none print:ring-0">
      <header className="min-h-32 border-b-2 border-rose-800 pb-3">
        <div className="flex gap-5">{assets['company-logo'] && <img src={assets['company-logo']} alt="" className="h-16 w-20 object-contain" />}
          <div className="min-w-0 flex-1">{assets['document-header'] && <img src={assets['document-header']} alt="" className="mb-1 max-h-16 max-w-full object-contain" />}<h3 className="font-bold">{settings.companyName}</h3><p className="whitespace-pre-wrap text-xs">{[settings.documentHeader, settings.companyAddress, [settings.companyPhone, settings.companyEmail].filter(Boolean).join(' · ')].filter(Boolean).join('\n')}</p></div>
        </div>
      </header>
      <p className="mt-8 text-right text-sm">{date}</p>
      {kind === 'lettre' && recipient && <p className="mt-8 text-sm">À l’attention de : {recipient}</p>}
      <h2 className="mt-9 text-xl font-bold uppercase">{OFFICIAL_KINDS[kind]}</h2>
      <h3 className="mt-6 text-base font-bold">Objet : {subject || '…'}</h3>
      <div className="mt-7 min-h-40 whitespace-pre-wrap break-words text-sm leading-7">{body || 'Votre texte apparaîtra ici.'}</div>
      {signed && <div className="mt-10 text-right text-sm"><p>{settings.directorTitle}</p>{signatureMode === 'image' && assets['director-signature'] ? <img className="ml-auto max-h-20 max-w-44 object-contain" src={assets['director-signature']} alt="Signature visuelle du DG" /> : <p className="mt-4 font-serif text-xl italic">{settings.directorName}</p>}<p className="mt-3 font-bold">{settings.directorName}</p></div>}
      <footer className="mt-14 border-t pt-3 text-xs text-gray-600">{assets['document-footer'] && <img src={assets['document-footer']} alt="" className="mb-2 max-h-12 max-w-full object-contain" />}<p className="whitespace-pre-wrap">{settings.documentFooter}</p></footer>
    </div>
    <style jsx global>{`@media print { @page { size: A4; margin: 15mm; } body * { visibility: hidden !important; } .official-print-page, .official-print-page * { visibility: visible !important; } .official-print-page { position: absolute; left: 0; top: 0; width: 100%; color: #242424; } .official-print-page header, .official-print-page footer { break-inside: avoid; } }`}</style>
  </div>;
}
