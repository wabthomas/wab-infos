'use client';

import { useEffect, useRef, useState } from 'react';
import { buildContractDocument } from '@/lib/redaction/rh/contract-document';
import { formatContractSelection, type ContractFormatCommand } from '@/lib/redaction/rh/contract-format';
import { ContractPdfPreview } from './contract-pdf-preview';
import Link from 'next/link';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { DEFAULT_ORGANIZATION_SETTINGS, type OrganizationSettings } from '@/lib/redaction/rh/organization';
import { useToast } from '@/components/ui/toast';

type ContractTemplate = { id:string;kind:'CDD'|'CDI';title:string;clauses:string;version:number };
type ContractCase = { id: string; collaboratorId: string; kind: 'CDD'|'CDI'; jobTitle:string; workLocation:string; startDate:string; endDate:string|null; salary:string; currency:'CDF'|'USD'; clauses:string; status:'draft'|'proposed'|'accepted'; version:number; firstName:string;lastName:string; employeeSignature:string|null };
type Person = { id: string; firstName: string; lastName: string; jobTitle: string; startDate: string; archived: boolean };
async function png(src: string | null, opacity = 1): Promise<string | null> {
  if (!src) return null;
  return new Promise(resolve => {
    const image = new Image(); image.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); if (!ctx) { resolve(null); return; }
      ctx.globalAlpha = opacity; ctx.drawImage(image, 0, 0); resolve(canvas.toDataURL('image/png'));
    }; image.onerror = () => resolve(null); image.src = src;
  });
}

/** Préparation documentaire uniquement : pas de clauses légales inventées ni de signature du collaborateur par l'admin. */
export function ContractsWorkspace() {
  const toast = useToast();
  const [people, setPeople] = useState<Person[]>([]);
  const [cases,setCases] = useState<ContractCase[]>([]), [selected,setSelected] = useState<ContractCase|null>(null);
  const [templates,setTemplates] = useState<ContractTemplate[]>([]), [selectedTemplate,setSelectedTemplate] = useState<ContractTemplate|null>(null), [templateTitle,setTemplateTitle] = useState('');
  const [savedSnapshot,setSavedSnapshot] = useState('');
  const [settings, setSettings] = useState<OrganizationSettings>(DEFAULT_ORGANIZATION_SETTINGS);
  const [seal, setSeal] = useState<string | null>(null), [signature, setSignature] = useState<string | null>(null);
  const [personId, setPersonId] = useState(''), [kind, setKind] = useState<'CDD' | 'CDI'>('CDD');
  const [startDate, setStartDate] = useState(''), [endDate, setEndDate] = useState('');
  const [job, setJob] = useState(''), [location, setLocation] = useState('');
  const [salary, setSalary] = useState(''), [currency, setCurrency] = useState<'CDF' | 'USD'>('CDF');
  const [clauses, setClauses] = useState(''), [approved, setApproved] = useState(false);
  const [previewPdf, setPreviewPdf] = useState<Uint8Array | null>(null);
  const [previewStatus, setPreviewStatus] = useState('Sélectionnez un collaborateur et saisissez le corps du contrat.');
  const clausesRef = useRef<HTMLTextAreaElement>(null);
  const [sign, setSign] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const person = people.find(p => p.id === personId);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const paths = ['/api/redaction/rh/contrats/modeles','/api/redaction/rh/contrats','/api/redaction/rh/collaborateurs','/api/redaction/rh/organisation','/api/redaction/rh/organisation/assets/company-seal','/api/redaction/rh/organisation/assets/director-signature'];
        const responses = await Promise.all(paths.map(path => fetchRedaction(path, { cache: 'no-store' })));
        if (responses.some(response => !response.ok)) throw new Error('Chargement RH impossible.');
        const [savedTemplates,savedCases,list, org, stamp, image] = await Promise.all(responses.map(r => r.json()));
        if (active) { setTemplates(savedTemplates.templates); setCases(savedCases.contracts); setPeople((list.collaborators as Person[]).filter(p => !p.archived)); setSettings({ ...DEFAULT_ORGANIZATION_SETTINGS, ...org.settings }); setSeal(stamp.asset); setSignature(image.asset); }
      } catch { if (active) setError('Impossible de charger les collaborateurs et les visuels RH.'); }
    }
    void load(); return () => { active = false; };
  }, []);
  async function saveTemplate() {
    if(!templateTitle.trim()||!clauses.trim()){setError('Indiquez le nom et les clauses du modèle.');return;}
    setBusy(true);setError('');try {
      const r=await fetchRedaction('/api/redaction/rh/contrats/modeles',{method:selectedTemplate?'PATCH':'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind,title:templateTitle,clauses,...(selectedTemplate?{id:selectedTemplate.id,version:selectedTemplate.version,action:'update'}:{})})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'Modèle invalide.');
      setTemplates(current=>[data.template,...current.filter(t=>t.id!==data.template.id)]);setSelectedTemplate(data.template);toast.success('Modèle CDD/CDI enregistré.');
    }catch(e){setError(e instanceof Error?e.message:'Enregistrement impossible.');}finally{setBusy(false);}
  }
  async function archiveTemplate() {
    if(!selectedTemplate||!window.confirm('Archiver ce modèle ? Les contrats déjà transmis restent inchangés.'))return;
    setBusy(true);setError('');try {
      const r=await fetchRedaction('/api/redaction/rh/contrats/modeles',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:selectedTemplate.id,version:selectedTemplate.version,action:'archive'})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'Archivage impossible.');
      setTemplates(current=>current.filter(t=>t.id!==selectedTemplate.id));setSelectedTemplate(null);setTemplateTitle('');toast.success('Modèle archivé.');
    }catch(e){setError(e instanceof Error?e.message:'Archivage impossible.');}finally{setBusy(false);}
  }
  function applyTemplate(item:ContractTemplate) {
    if (clauses.trim() && clauses!==item.clauses && !window.confirm('Remplacer les clauses actuellement saisies par ce modèle ?')) return;
    setSelectedTemplate(item);setTemplateTitle(item.title);setKind(item.kind);setClauses(item.clauses);setApproved(false);setSign(false);
  }
  function payload() { return { collaboratorId:personId,kind,jobTitle:job,workLocation:location,startDate,endDate:kind==='CDD'?endDate:null,salary,currency,clauses }; }
  function choose(item:ContractCase, force = false) {
    if (!force && (selected || clauses.trim() || salary.trim()) && JSON.stringify(payload()) !== savedSnapshot && !window.confirm('Quitter ce brouillon sans enregistrer les dernières modifications ?')) return;
    setSelectedTemplate(null);setTemplateTitle('');setSelected(item);setPersonId(item.collaboratorId);setKind(item.kind);setJob(item.jobTitle);setLocation(item.workLocation);
    setStartDate(item.startDate);setEndDate(item.endDate??'');setSalary(item.salary);setCurrency(item.currency);setClauses(item.clauses);
    setSavedSnapshot(JSON.stringify({ collaboratorId:item.collaboratorId,kind:item.kind,jobTitle:item.jobTitle,workLocation:item.workLocation,startDate:item.startDate,endDate:item.kind==='CDD'?item.endDate:null,salary:item.salary,currency:item.currency,clauses:item.clauses }));
    setApproved(false);setSign(false);setError('');
  }
  function newCase(force = false) { if (!force && (selected || clauses.trim() || salary.trim()) && JSON.stringify(payload()) !== savedSnapshot && !window.confirm('Quitter ce brouillon sans enregistrer les dernières modifications ?')) return; setSelectedTemplate(null);setTemplateTitle('');setSelected(null);setPersonId('');setKind('CDD');setJob('');setLocation('');setStartDate('');setEndDate('');setSalary('');setCurrency('CDF');setClauses('');setSavedSnapshot('');setApproved(false);setSign(false);setError(''); }
  async function reload(id?:string) {
    const r=await fetchRedaction('/api/redaction/rh/contrats',{cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error||'Lecture impossible.');
    setCases(data.contracts);if(id) {const found=(data.contracts as ContractCase[]).find(c=>c.id===id);if(found)choose(found,true);}
  }
  async function saveDraft() {
    setBusy(true);setError('');try {
      const r=await fetchRedaction('/api/redaction/rh/contrats',{method:selected?'PATCH':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(selected?{action:'update',id:selected.id,version:selected.version,contract:payload()}:payload())});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'Enregistrement impossible.');
      await reload(selected?.id??data.id);toast.success('Brouillon enregistré sur le serveur.');
    }catch(e){const message=e instanceof Error?e.message:'Enregistrement impossible.';setError(message);toast.error(message);}finally{setBusy(false);}
  }
  async function proposeCase() {
    if(!selected||selected.status!=='draft'||!approved||!sign)return;
    if(JSON.stringify(payload())!==savedSnapshot){setError('Enregistrez vos modifications avant transmission.');return;}
    setBusy(true);setError('');try {
      const r=await fetchRedaction('/api/redaction/rh/contrats',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({action:'propose',id:selected.id,version:selected.version,legalApproved:true,dgApproved:true})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'Transmission impossible.');
      await reload(selected.id);toast.success('Version figée et transmise au collaborateur lié.');
    }catch(e){const message=e instanceof Error?e.message:'Transmission impossible.';setError(message);toast.error(message);}finally{setBusy(false);}
  }
  async function archiveCase() {
    if(!selected||selected.status!=='draft'||!window.confirm('Archiver ce brouillon ?'))return;
    setBusy(true);setError('');try {
      const r=await fetchRedaction('/api/redaction/rh/contrats',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({action:'archive',id:selected.id,version:selected.version})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'Archivage impossible.');
      await reload();newCase(true);toast.success('Brouillon archivé.');
    }catch(e){setError(e instanceof Error?e.message:'Archivage impossible.');}finally{setBusy(false);}
  }
  function changePerson(id: string) {
    const next = people.find(p => p.id === id);
    setPersonId(id); setJob(next?.jobTitle || ''); setStartDate(next?.startDate || ''); setApproved(false); setSign(false);
  }
  useEffect(() => {
    let active = true;
    setPreviewPdf(null);
    if (selected && selected.status !== 'draft') {
      setPreviewStatus('Chargement de la version enregistrée…');
      void (async () => {
        try {
          const response = await fetchRedaction(`/api/redaction/rh/contrats/${selected.id}/pdf`, { cache: 'no-store' });
          if (!response.ok) throw new Error('Version enregistrée indisponible.');
          const pdf = new Uint8Array(await response.arrayBuffer());
          if (active) setPreviewPdf(pdf);
        } catch { if (active) setPreviewStatus('Aperçu indisponible pour ce contrat.'); }
      })();
    } else if (person && clauses.trim()) {
      setPreviewStatus('Préparation de l’aperçu A4…');
      const timer = window.setTimeout(() => {
        void (async () => {
          try {
            const images = sign ? await Promise.all([png(seal, .22), png(signature)]) : [null, null];
            if (!active) return;
            const pdf = buildContractDocument({
              kind, firstName: person.firstName, lastName: person.lastName, jobTitle: job.trim(), workLocation: location.trim(),
              startDate, endDate: kind === 'CDD' ? endDate : null, salary: salary.replace(',', '.'), currency, clauses,
              employer: settings, draft: true,
            }, { seal: images[0], signature: images[1] });
            if (active) setPreviewPdf(new Uint8Array(pdf.output('arraybuffer')));
          } catch { if (active) setPreviewStatus('Préparation de l’aperçu impossible.'); }
        })();
      }, 450);
      return () => { active = false; window.clearTimeout(timer); };
    } else setPreviewStatus('Sélectionnez un collaborateur et saisissez le corps du contrat.');
    return () => { active = false; };
  }, [selected?.id, selected?.status, selected?.version, person?.firstName, person?.lastName, kind, job, location, startDate, endDate, salary, currency, clauses, settings, sign, seal, signature]);

  function applyFormat(command: ContractFormatCommand) {
    const textarea = clausesRef.current;
    if (!textarea || locked || busy) return;
    const result = formatContractSelection(clauses, textarea.selectionStart, textarea.selectionEnd, command);
    setClauses(result.value); setApproved(false); setSign(false);
    requestAnimationFrame(() => { textarea.focus(); textarea.setSelectionRange(result.start, result.end); });
  }
  async function exportPdf() {
    setError('');
    if(selected && selected.status!=='draft') {
      setBusy(true);try {
        const r=await fetchRedaction(`/api/redaction/rh/contrats/${selected.id}/pdf`,{cache:'no-store'});
        if(!r.ok){const data=await r.json();throw new Error(data.error||'PDF indisponible.');}
        const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download=`contrat-${selected.kind.toLowerCase()}-${selected.id}.pdf`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }catch(e){setError(e instanceof Error?e.message:'Téléchargement impossible.');}finally{setBusy(false);}return;
    }
    if (!person || !job.trim() || !location.trim() || !startDate || !clauses.trim() || !/^(?:[1-9]\d{0,11})(?:[.,]\d{1,2})?$/.test(salary) || (kind === 'CDD' && (!endDate || endDate <= startDate))) { setError('Complétez le dossier, les dates, le lieu, la rémunération et les clauses validées.'); return; }
    if (!approved) { setError('La validation juridique des clauses est nécessaire avant la préparation du PDF.'); return; }
    if (sign && (!settings.directorName.trim() || !signature || !seal)) { setError('Configurez le nom, le sceau et la signature image du DG avant son visa.'); return; }
    setBusy(true);
    try {
      const pdf = buildContractDocument({
        kind, firstName: person.firstName, lastName: person.lastName, jobTitle: job.trim(), workLocation: location.trim(),
        startDate, endDate: kind === 'CDD' ? endDate : null, salary: salary.replace(',', '.'), currency, clauses,
        employer: settings, draft: true,
      }, { seal: sign ? await png(seal, .22) : null, signature: sign ? await png(signature) : null });
      pdf.save(`projet-contrat-${kind.toLowerCase()}-${person.lastName.replace(/[^a-zA-Z0-9-]/g,'-')}.pdf`);
      toast.success('Projet PDF prêt. Déposez la version signée dans Documents RH après contrôle.');
    } catch { setError('Génération PDF impossible.'); toast.error('Génération PDF impossible.'); }
    finally { setBusy(false); }
  }
  const locked=Boolean(selected && selected.status!=='draft');
  const input = 'mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm';
  const formats: { command: ContractFormatCommand; label: string; title: string }[] = [
    { command: 'article', label: 'Article', title: 'Titre d’article' },
    { command: 'bold', label: 'G', title: 'Gras' },
    { command: 'italic', label: 'I', title: 'Italique' },
    { command: 'underline', label: 'S̲', title: 'Souligné' },
    { command: 'bullet', label: '• Liste', title: 'Liste à puces' },
    { command: 'number', label: '1. Liste', title: 'Liste numérotée' },
    { command: 'paragraph', label: '¶', title: 'Paragraphe normal' },
  ];
  return <div className="space-y-5 rounded-2xl border border-border bg-card p-4 sm:p-7">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">
      <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Contrats RH · RDC</p><h2 className="mt-1 text-2xl font-bold">Contrat CDD / CDI</h2></div>
      <button type="button" className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted" onClick={()=>newCase()}>+ Nouveau contrat</button>
    </header>
    {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <div className="min-w-0 space-y-5">
        <fieldset disabled={locked||busy} className="space-y-5 disabled:opacity-70">
          <section className="rounded-xl border p-4 sm:p-5">
            <h3 className="mb-4 text-base font-bold">01 · Informations du contrat</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Collaborateur<select className={input} disabled={!!selected} value={personId} onChange={e => changePerson(e.target.value)}><option value="">Sélectionner…</option>{people.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}</select></label>
              <label className="text-sm font-medium">Type de contrat<select className={input} value={kind} onChange={e => { setKind(e.target.value as 'CDD' | 'CDI'); setApproved(false); setSign(false); }}><option value="CDD">CDD</option><option value="CDI">CDI</option></select></label>
              <label className="text-sm font-medium">Fonction<input className={input} value={job} maxLength={160} onChange={e => { setJob(e.target.value); setApproved(false); setSign(false); }} /></label>
              <label className="text-sm font-medium">Lieu d’affectation<input className={input} value={location} maxLength={180} onChange={e => { setLocation(e.target.value); setApproved(false); setSign(false); }} /></label>
              <label className="text-sm font-medium">Date de prise d’effet<input className={input} type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setApproved(false); setSign(false); }} /></label>
              {kind === 'CDD' && <label className="text-sm font-medium">Date de fin<input className={input} type="date" value={endDate} min={startDate} onChange={e => { setEndDate(e.target.value); setApproved(false); setSign(false); }} /></label>}
              <label className="text-sm font-medium">Rémunération<input className={input} inputMode="decimal" value={salary} onChange={e => { setSalary(e.target.value); setApproved(false); setSign(false); }} placeholder="Montant" /></label>
              <label className="text-sm font-medium">Devise<select className={input} value={currency} onChange={e => { setCurrency(e.target.value as 'CDF' | 'USD'); setApproved(false); setSign(false); }}><option>CDF</option><option>USD</option></select></label>
            </div>
          </section>
          <section className="overflow-hidden rounded-xl border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 p-4 sm:px-5"><h3 className="text-base font-bold">02 · Corps du contrat</h3><span className="text-xs tabular-nums text-muted-foreground">{clauses.length} / 12 000 caractères</span></div>
            <div role="toolbar" aria-label="Mise en forme du corps du contrat" className="flex flex-wrap items-center gap-1 border-b p-2 sm:px-4">
              {formats.map(item=><button key={item.command} type="button" title={item.title} aria-label={item.title} onMouseDown={e=>e.preventDefault()} onClick={()=>applyFormat(item.command)} className={`min-h-9 rounded-lg border px-2.5 text-sm hover:bg-muted ${item.command==='bold'?'font-bold':item.command==='italic'?'italic':''}`}>{item.label}</button>)}
            </div>
            <label className="block px-4 pt-3 text-sm font-medium sm:px-5" htmlFor="contract-body">Corps texte</label>
            <textarea id="contract-body" ref={clausesRef} className="min-h-80 w-full resize-y bg-background px-4 py-3 font-mono text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-5" value={clauses} maxLength={12000} onChange={e => { setClauses(e.target.value); setApproved(false); setSign(false); }} placeholder="Saisissez les clauses vérifiées…" />
          </section>
          <section className="space-y-3 rounded-xl border p-4 sm:p-5">
            <h3 className="text-base font-bold">03 · Validation et visa</h3>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={approved} onChange={e => { setApproved(e.target.checked); setSign(false); }} className="mt-1" /> Clauses, dates et montants validés pour ce contrat soumis au droit de la RDC.</label>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={sign} disabled={!approved || !signature || !seal || !settings.directorName} onChange={e => setSign(e.target.checked)} className="mt-1" /> Après accord réel du DG, afficher son image de signature et le sceau.</label>
            <p className="text-xs text-muted-foreground">La signature image est uniquement visuelle. L’accord du collaborateur est recueilli par lui-même ; aucune signature électronique qualifiée n’est créée.</p>
          </section>
        </fieldset>
        <div className="flex flex-wrap items-center gap-2 border-t pt-5">
          {!locked&&<button type="button" disabled={busy} onClick={()=>void saveDraft()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{selected?'Enregistrer les modifications':'Enregistrer le brouillon'}</button>}
          {!locked&&selected&&<button type="button" disabled={busy||!approved||!sign} onClick={()=>void proposeCase()} className="rounded-xl border border-primary px-4 py-2.5 text-sm font-bold text-primary disabled:opacity-50">Transmettre pour accord</button>}
          <button type="button" disabled={busy} onClick={() => void exportPdf()} className="rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-50">{busy ? 'Préparation…' : locked?'Télécharger la version figée':'Télécharger le projet PDF'}</button>
          {!locked&&selected&&<button type="button" disabled={busy} onClick={()=>void archiveCase()} className="rounded-xl border px-4 py-2.5 text-sm text-red-600 disabled:opacity-50">Archiver le brouillon</button>}
        </div>
        <Link href="/rh/documents" className="inline-block text-sm font-semibold text-primary underline">Déposer la version signée dans Documents RH</Link>
      </div>
      <aside className="space-y-5">
        <ContractPdfPreview bytes={previewPdf} status={previewStatus} />
        <section className="rounded-xl border bg-muted/20 p-4"><h3 className="font-bold">Dossiers enregistrés</h3>
          <div className="mt-3 grid max-h-72 gap-2 overflow-auto">{cases.map(item=><button type="button" key={item.id} onClick={()=>choose(item)} aria-pressed={selected?.id===item.id} className={`rounded-xl border p-3 text-left text-sm ${selected?.id===item.id?'border-primary bg-primary/10':'bg-card hover:border-primary/40'}`}><strong>{item.kind} · {item.firstName} {item.lastName}</strong><span className="mt-1 block text-xs text-muted-foreground">{item.jobTitle} · {item.status==='draft'?'Brouillon':item.status==='proposed'?'À examiner':'Accord enregistré'} · v{item.version}</span></button>)}</div>
          {!cases.length&&<p className="mt-3 text-sm text-muted-foreground">Aucun dossier.</p>}
        </section>
        <section className="rounded-xl border bg-muted/20 p-4"><h3 className="font-bold">Modèles de clauses</h3>
          <select aria-label="Choisir un modèle contractuel" disabled={locked||busy} className={input} value={selectedTemplate?.id??''} onChange={e=>{const item=templates.find(t=>t.id===e.target.value);if(item)applyTemplate(item);else{setSelectedTemplate(null);setTemplateTitle('');}}}><option value="">Nouvelle trame</option>{templates.map(t=><option key={t.id} value={t.id}>{t.kind} · {t.title} (v{t.version})</option>)}</select>
          <input className={input} aria-label="Nom du modèle contractuel" placeholder="Nom de la trame" maxLength={120} value={templateTitle} disabled={locked||busy} onChange={e=>setTemplateTitle(e.target.value)} />
          <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={locked||busy||!templateTitle.trim()||!clauses.trim()} onClick={()=>void saveTemplate()} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">{selectedTemplate?'Mettre à jour':'Enregistrer la trame'}</button>{selectedTemplate&&<button type="button" disabled={locked||busy} onClick={()=>void archiveTemplate()} className="rounded-lg border px-3 py-2 text-sm text-red-600 disabled:opacity-50">Archiver</button>}</div>
        </section>
      </aside>
    </div>
  </div>;
}
