'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserDocumentLink } from './browser-document-link';
import { deliverRhDocument } from '@/lib/redaction/rh/browser-document';
import { contractPartiesFromProfile, type ContractProfile } from '@/lib/redaction/rh/contract-parties';
import { DEFAULT_CONTRACT_DISPLAY, MAX_CONTRACT_CLAUSES, type ContractDisplayOptions } from '@/lib/redaction/rh/contracts';
import { contractProgress } from '@/lib/redaction/rh/contract-lifecycle';
import { buildContractDocument } from '@/lib/redaction/rh/contract-document';
import { formatContractSelection, type ContractFormatCommand } from '@/lib/redaction/rh/contract-format';
import { ContractPdfPreview } from './contract-pdf-preview';
import Link from 'next/link';
import { Archive, CheckCircle2, Clock3, Download, Eye, EyeOff, FilePlus2, FileText, PenLine, Plus, Save, Send, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { DEFAULT_ORGANIZATION_SETTINGS, type OrganizationSettings } from '@/lib/redaction/rh/organization';
import { useToast } from '@/components/ui/toast';

type ContractTemplate = { id:string;kind:'CDD'|'CDI';title:string;clauses:string;signaturePlace:string;signatureDate:string|null;version:number };
type ContractCase = { id: string; collaboratorId: string; kind: 'CDD'|'CDI'; jobTitle:string; workLocation:string; startDate:string; endDate:string|null; salary:string; currency:'CDF'|'USD'; clauses?:string; birthPlace:string; signaturePlace:string; signatureDate:string|null; status:'draft'|'proposed'|'pending_approval'|'accepted'|'declined'; approvedAt:string|null; version:number; firstName:string;lastName:string; employeeSignature:string|null;signatureMode:string|null;consentCompanyRules:boolean;consentWorkRules:boolean;acceptedAt:string|null; displayOptions?:Partial<ContractDisplayOptions>|null };
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
  const [seal, setSeal] = useState<string | null>(null), [signature, setSignature] = useState<string | null>(null), [logo, setLogo] = useState<string | null>(null);
  const [personId, setPersonId] = useState(''), [kind, setKind] = useState<'CDD' | 'CDI'>('CDD');
  const [startDate, setStartDate] = useState(''), [endDate, setEndDate] = useState('');
  const [job, setJob] = useState(''), [location, setLocation] = useState('');
  const [showContractFields, setShowContractFields] = useState(true);
  const [activeTab, setActiveTab] = useState<'gestion'|'redaction'|'configuration'>('gestion');
  const [contractQuery, setContractQuery] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [browserLink,setBrowserLink] = useState<string|null>(null);
  const [salary, setSalary] = useState(''), [currency, setCurrency] = useState<'CDF' | 'USD'>('CDF');
  const [birthPlace, setBirthPlace] = useState('');
  const [signaturePlace, setSignaturePlace] = useState(''), [signatureDate, setSignatureDate] = useState('');
  const [displayOptions, setDisplayOptions] = useState<ContractDisplayOptions>(DEFAULT_CONTRACT_DISPLAY);
  const [detailLoading, setDetailLoading] = useState(false);
  const [profile, setProfile] = useState<ContractProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [clauses, setClauses] = useState(''), [approved, setApproved] = useState(false), [authorized, setAuthorized] = useState(false);
  const [previewPdf, setPreviewPdf] = useState<Uint8Array | null>(null);
  const [previewStatus, setPreviewStatus] = useState('Sélectionnez un collaborateur et saisissez le corps du contrat.');
  const clausesRef = useRef<HTMLTextAreaElement>(null);
  const [sign, setSign] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const person = people.find(p => p.id === personId);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const paths = ['/api/redaction/rh/contrats/modeles','/api/redaction/rh/contrats','/api/redaction/rh/collaborateurs','/api/redaction/rh/organisation','/api/redaction/rh/organisation/assets/company-seal','/api/redaction/rh/organisation/assets/director-signature','/api/redaction/rh/organisation/assets/company-logo'];
        const responses = await Promise.all(paths.map(path => fetchRedaction(path, { cache: 'no-store' })));
        if (responses.some(response => !response.ok)) throw new Error('Chargement RH impossible.');
        const [savedTemplates,savedCases,list, org, stamp, image, brand] = await Promise.all(responses.map(r => r.json()));
        if (active) { setTemplates(savedTemplates.templates); setCases(savedCases.contracts); setPeople((list.collaborators as Person[]).filter(p => !p.archived)); setSettings({ ...DEFAULT_ORGANIZATION_SETTINGS, ...org.settings }); setSeal(stamp.asset); setSignature(image.asset); setLogo(brand.asset); }
      } catch { if (active) setError('Impossible de charger les collaborateurs et les visuels RH.'); }
    }
    void load(); return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!personId) return;
    let active = true;
    // Never reuse another collaborator's identity during asynchronous selection changes.
    void (async () => {
      try {
        const response = await fetchRedaction(`/api/redaction/rh/contrats/profil?collaboratorId=${encodeURIComponent(personId)}`, { cache:'no-store' });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (active) setProfile(data.profile);
      } catch { if (active) setProfile(null); }
      finally { if (active) setProfileLoading(false); }
    })();
    return () => { active = false; };
  }, [personId]);
  const parties = profileLoading ? null : contractPartiesFromProfile(profile, birthPlace);
  async function saveTemplate() {
    if(!templateTitle.trim()||!clauses.trim()){setError('Indiquez le nom et les clauses du modèle.');return;}
    setBusy(true);setError('');try {
      const r=await fetchRedaction('/api/redaction/rh/contrats/modeles',{method:selectedTemplate?'PATCH':'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind,title:templateTitle,clauses,signaturePlace,signatureDate:signatureDate||null,...(selectedTemplate?{id:selectedTemplate.id,version:selectedTemplate.version,action:'update'}:{})})});
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
    setSelectedTemplate(item);setTemplateTitle(item.title);setKind(item.kind);setClauses(item.clauses ?? '');setSignaturePlace(item.signaturePlace || '');setSignatureDate(item.signatureDate || '');setApproved(false);setSign(false);
  }
  function payload() { return { collaboratorId:personId,kind,jobTitle:job,workLocation:location,startDate,endDate:kind==='CDD'?endDate:null,salary,currency,clauses,birthPlace,signaturePlace,signatureDate:signatureDate||null,displayOptions }; }
  async function choose(item:ContractCase, force = false) {
    if (!force && (selected || clauses.trim() || salary.trim()) && JSON.stringify(payload()) !== savedSnapshot && !window.confirm('Quitter ce brouillon sans enregistrer les dernières modifications ?')) return;
    if (item.clauses === undefined) {
      setDetailLoading(true);
      try {
        const response = await fetchRedaction(`/api/redaction/rh/contrats?id=${encodeURIComponent(item.id)}`, { cache: 'no-store' });
        const data = await response.json();
        const full = (data.contracts as ContractCase[] | undefined)?.[0];
        if (!response.ok || !full || full.clauses === undefined) throw new Error();
        setDetailLoading(false);
        await choose(full, true);
      } catch { setDetailLoading(false); setError('Impossible de charger le contrat sélectionné.'); }
      return;
    }
    setSelectedTemplate(null);setTemplateTitle('');if (!force) setActiveTab('gestion');setBrowserLink(null);setSelected(item);setPersonId(item.collaboratorId);setKind(item.kind);setJob(item.jobTitle);setLocation(item.workLocation);setDisplayOptions({ ...DEFAULT_CONTRACT_DISPLAY, ...(item.displayOptions ?? {}) });
    setStartDate(item.startDate);setEndDate(item.endDate??'');setSalary(item.salary);setCurrency(item.currency);setClauses(item.clauses ?? '');setBirthPlace(item.birthPlace || '');setSignaturePlace(item.signaturePlace || '');setSignatureDate(item.signatureDate || '');if (personId !== item.collaboratorId) { setProfile(null);setProfileLoading(true); }
    setSavedSnapshot(JSON.stringify({ collaboratorId:item.collaboratorId,kind:item.kind,jobTitle:item.jobTitle,workLocation:item.workLocation,startDate:item.startDate,endDate:item.kind==='CDD'?item.endDate:null,salary:item.salary,currency:item.currency,clauses:item.clauses ?? '',birthPlace:item.birthPlace || '',signaturePlace:item.signaturePlace || '',signatureDate:item.signatureDate || null,displayOptions:{ ...DEFAULT_CONTRACT_DISPLAY, ...(item.displayOptions ?? {}) } }));
    setApproved(false);setAuthorized(false);setSign(false);setError('');
  }
  function newCase(force = false) { if (!force && (selected || clauses.trim() || salary.trim()) && JSON.stringify(payload()) !== savedSnapshot && !window.confirm('Quitter ce brouillon sans enregistrer les dernières modifications ?')) return; setSelectedTemplate(null);setTemplateTitle('');setActiveTab('redaction');setSelected(null);setPersonId('');setKind('CDD');setJob('');setLocation('');setStartDate('');setEndDate('');setSalary('');setCurrency('CDF');setClauses('');setBirthPlace('');setSignaturePlace('');setSignatureDate('');setProfile(null);setProfileLoading(false);setSavedSnapshot('');setApproved(false);setAuthorized(false);setSign(false);setError(''); }
  async function reload(id?:string) {
    const r=await fetchRedaction('/api/redaction/rh/contrats',{cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error||'Lecture impossible.');
    setCases(data.contracts);if(id) {const found=(data.contracts as ContractCase[]).find(c=>c.id===id);if(found)choose(found,true);}
  }
  async function saveDraft() {
    setBusy(true);setError('');try {
      const r=await fetchRedaction('/api/redaction/rh/contrats',{method:selected?'PATCH':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(selected?{action:'update',id:selected.id,version:selected.version,contract:payload()}:payload())});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'Enregistrement impossible.');
      await reload(selected?.id??data.id);toast.success('Brouillon enregistré sur le serveur.');
    }catch(e){const message=e instanceof Error?e.message:'Enregistrement impossible.';setShowContractFields(true);setError(message);toast.error(message);}finally{setBusy(false);}
  }
  async function proposeCase() {
    if(!selected||selected.status!=='draft'||!approved||!authorized||!sign)return;
    if(JSON.stringify(payload())!==savedSnapshot){setError('Enregistrez vos modifications avant transmission.');return;}
    if (!signaturePlace.trim() || !signatureDate) { setError('Configurez le lieu et la date de signature dans le modèle, puis enregistrez le dossier avant transmission.'); return; }
    if (!parties) { setError('Complétez la fiche d’identification (date de naissance, adresse et téléphone) et le lieu de naissance avant transmission.'); return; }
    setBusy(true);setError('');try {
      const r=await fetchRedaction('/api/redaction/rh/contrats',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({action:'propose',id:selected.id,version:selected.version,legalApproved:true,dgApproved:true,directorAuthorized:authorized})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'Transmission impossible.');
      await reload(selected.id);toast.success('Version figée et transmise au collaborateur lié.');
    }catch(e){const message=e instanceof Error?e.message:'Transmission impossible.';setError(message);toast.error(message);}finally{setBusy(false);}
  }
  async function approveCase() {
    if (!selected || selected.status !== 'pending_approval' || !window.confirm('Vous confirmez avoir contrôlé la signature, les consentements et les clauses avant d’approuver ce contrat ?')) return;
    setBusy(true);setError('');
    try {
      const response=await fetchRedaction(`/api/redaction/rh/contrats/${selected.id}/approbation`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'approve',version:selected.version})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Approbation impossible.');
      await reload(selected.id);toast.success('Contrat approuvé. Sa prise d’effet dépend de la date contractuelle.');
    }catch(e){const message=e instanceof Error?e.message:'Approbation impossible.';setError(message);toast.error(message);}finally{setBusy(false);}
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
    setProfile(null);setProfileLoading(Boolean(id));setBirthPlace('');setPersonId(id); setJob(next?.jobTitle || ''); setStartDate(next?.startDate || ''); setApproved(false); setSign(false);
  }
  useEffect(() => {
    let active = true;
    setPreviewPdf(null);
    if (!showPreview) return () => { active = false; };
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
            const images = await Promise.all([png(logo), sign ? png(seal, .85) : null, sign ? png(signature) : null]);
            if (!active) return;
            const pdf = buildContractDocument({
              kind, firstName: person.firstName, lastName: person.lastName, jobTitle: job.trim(), workLocation: location.trim(),
              startDate, endDate: kind === 'CDD' ? endDate : null, salary: salary.replace(',', '.'), currency, clauses, parties, signaturePlace, signatureDate, displayOptions,
              employer: { ...settings, directorAuthorized:authorized }, draft: true,
            }, { logo: images[0], seal: images[1], signature: images[2] });
            if (active) setPreviewPdf(new Uint8Array(pdf.output('arraybuffer')));
          } catch { if (active) setPreviewStatus('Préparation de l’aperçu impossible.'); }
        })();
      }, 450);
      return () => { active = false; window.clearTimeout(timer); };
    } else setPreviewStatus('Sélectionnez un collaborateur et saisissez le corps du contrat.');
    return () => { active = false; };
  }, [showPreview, selected?.id, selected?.status, selected?.version, person?.firstName, person?.lastName, kind, job, location, startDate, endDate, salary, currency, clauses, birthPlace, signaturePlace, signatureDate, authorized, displayOptions, parties?.birthDate, parties?.address, parties?.phone, profileLoading, settings, sign, seal, signature, logo]);

  function applyFormat(command: ContractFormatCommand) {
    const textarea = clausesRef.current;
    if (!textarea || locked || busy) return;
    const result = formatContractSelection(clauses, textarea.selectionStart, textarea.selectionEnd, command);
    if (result.value.length > MAX_CONTRACT_CLAUSES || result.value.split('\n').length > 250) { setError('Corps du contrat limité à 15 000 caractères et 250 lignes.'); return; }
    setError(''); setClauses(result.value); setApproved(false); setSign(false);
    requestAnimationFrame(() => { textarea.focus(); textarea.setSelectionRange(result.start, result.end); });
  }
  async function exportPdf() {
    setError('');
    if(selected && selected.status!=='draft') {
      setBusy(true);try {
        const r=await fetchRedaction(`/api/redaction/rh/contrats/${selected.id}/pdf`,{cache:'no-store'});
        if(!r.ok){const data=await r.json();throw new Error(data.error||'PDF indisponible.');}
        setBrowserLink(await deliverRhDocument(await r.blob(),`contrat-${selected.kind.toLowerCase()}-${selected.id}.pdf`));
      }catch(e){setError(e instanceof Error?e.message:'Téléchargement impossible.');}finally{setBusy(false);}return;
    }
    if (!person || !job.trim() || !location.trim() || !startDate || !clauses.trim() || !/^(?:[1-9]\d{0,11})(?:[.,]\d{1,2})?$/.test(salary) || (kind === 'CDD' && (!endDate || endDate <= startDate))) { setShowContractFields(true); setError('Complétez le dossier, les dates, le lieu, la rémunération et les clauses validées.'); return; }
    if (!approved) { setError('La validation juridique des clauses est nécessaire avant la préparation du PDF.'); return; }
    if (sign && (!settings.directorName.trim() || !signature || !seal)) { setError('Configurez le nom, le sceau et la signature image du DG avant son visa.'); return; }
    setBusy(true);
    try {
      const pdf = buildContractDocument({
        kind, firstName: person.firstName, lastName: person.lastName, jobTitle: job.trim(), workLocation: location.trim(),
        startDate, endDate: kind === 'CDD' ? endDate : null, salary: salary.replace(',', '.'), currency, clauses, parties, signaturePlace, signatureDate, displayOptions,
        employer: { ...settings, directorAuthorized:authorized }, draft: true,
      }, { logo: await png(logo), seal: sign ? await png(seal, .85) : null, signature: sign ? await png(signature) : null });
      setBrowserLink(await deliverRhDocument(pdf.output('blob'),`projet-contrat-${kind.toLowerCase()}-${person.lastName.replace(/[^a-zA-Z0-9-]/g,'-')}.pdf`));
      toast.success('Projet PDF prêt. Déposez la version signée dans Documents RH après contrôle.');
    } catch { setError('Génération PDF impossible.'); toast.error('Génération PDF impossible.'); }
    finally { setBusy(false); }
  }
  const locked=Boolean(selected && selected.status!=='draft');
  const input = 'mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm';
  const formats: { command: ContractFormatCommand; label: string; title: string }[] = [
    { command: 'article', label: 'Article', title: 'Titre d’article' },
    { command: 'subheading', label: 'Sous-titre', title: 'Sous-titre ou rubrique' },
    { command: 'table', label: '▦ Tableau', title: 'Insérer un tableau à deux colonnes' },
    { command: 'bold', label: 'G', title: 'Gras' },
    { command: 'italic', label: 'I', title: 'Italique' },
    { command: 'underline', label: 'S̲', title: 'Souligné' },
    { command: 'bullet', label: '• Liste', title: 'Liste à puces' },
    { command: 'number', label: '1. Liste', title: 'Liste numérotée' },
    { command: 'paragraph', label: '¶', title: 'Paragraphe normal' },
  ];
  const statusTone = (status: ContractCase['status']) => status === 'accepted'
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    : status === 'declined'
      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
      : status === 'draft'
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : 'bg-sky-500/10 text-sky-700 dark:text-sky-300';
  const visibleCases = cases.filter(item => `${item.firstName} ${item.lastName} ${item.kind} ${item.jobTitle}`.toLowerCase().includes(contractQuery.trim().toLowerCase()));
  const stats = {
    draft: cases.filter(item => item.status === 'draft').length,
    pending: cases.filter(item => item.status === 'proposed' || item.status === 'pending_approval').length,
    accepted: cases.filter(item => item.status === 'accepted').length,
    declined: cases.filter(item => item.status === 'declined').length,
  };
  return <div className="space-y-5 rounded-2xl border border-border bg-card p-4 sm:p-7">
    <header className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.10] via-card to-card">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><FileText className="h-6 w-6" /></span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Contrats RH · RDC</p>
            <h2 className="mt-1 font-display text-2xl font-bold">Contrat CDD / CDI</h2>
            <p className="mt-1 text-sm text-muted-foreground">Préparez, transmettez et suivez les contrats de l'équipe.</p>
          </div>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-90" onClick={() => newCase()}><FilePlus2 className="h-4 w-4" /> Nouveau contrat</button>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-primary/10 bg-primary/10 sm:grid-cols-4">
        {([
          ['Brouillons', stats.draft, 'bg-amber-500/10 text-amber-700 dark:text-amber-300'],
          ['En cours', stats.pending, 'bg-sky-500/10 text-sky-700 dark:text-sky-300'],
          ['Approuvés', stats.accepted, 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'],
          ['Refusés', stats.declined, 'bg-rose-500/10 text-rose-700 dark:text-rose-300'],
        ] as const).map(([label, value]) => (
          <div key={label} className="bg-card px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-0.5 font-display text-xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
    </header>
    <nav aria-label="Sections des contrats" className="flex flex-wrap gap-2">
      {([
        ['gestion', 'Gestion', Users],
        ['redaction', 'Rédaction', PenLine],
        ['configuration', 'Configuration', Sparkles],
      ] as const).map(([key, label, Icon]) => (
        <button key={key} type="button" aria-current={activeTab === key ? 'page' : undefined} onClick={() => setActiveTab(key)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${activeTab === key ? 'bg-primary text-primary-foreground shadow-sm' : 'border border-border bg-card hover:bg-muted'}`}>
          <Icon className="h-4 w-4" /> {label}
        </button>
      ))}
    </nav>
    {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {detailLoading && <p role="status" className="rounded-xl border border-primary/30 bg-primary/[0.04] p-3 text-sm text-primary">Chargement du contrat…</p>}
    <div className={activeTab==='redaction' ? 'grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]' : 'space-y-5'}>
      {activeTab==='redaction'&&<div className="min-w-0 space-y-5">
        <button type="button" aria-expanded={showContractFields} aria-controls="contract-optional-fields" onClick={() => setShowContractFields(current => !current)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">{showContractFields ? 'Masquer les champs du contrat' : 'Afficher les champs du contrat'}</button>
        <fieldset disabled={locked||busy} className="space-y-5 disabled:opacity-70">
          {showContractFields ? <section className="rounded-xl border p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-4 w-4" /></span><h3 className="text-base font-bold">01 · Informations du contrat</h3></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Collaborateur<select className={input} disabled={!!selected} value={personId} onChange={e => changePerson(e.target.value)}><option value="">Sélectionner…</option>{people.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}</select></label>
              <label className="text-sm font-medium">Type de contrat<select className={input} value={kind} onChange={e => { setKind(e.target.value as 'CDD' | 'CDI'); setApproved(false); setSign(false); }}><option value="CDD">CDD</option><option value="CDI">CDI</option></select></label>
              <label className="text-sm font-medium">Lieu de naissance<input className={input} value={birthPlace} maxLength={120} onChange={e => { setBirthPlace(e.target.value); setApproved(false); setSign(false); }} placeholder="À renseigner — distinct de la ville de résidence" /></label>
              <p className="self-center text-xs text-muted-foreground">Fiche d’identification : {profileLoading ? 'chargement…' : profile ? `Naissance : ${profile.birthDate || 'à compléter'} · Adresse : ${profile.address || 'à compléter'} · Téléphone : ${profile.phone || 'à compléter'}` : 'fiche indisponible. Complétez-la avant transmission.'}</p>
            </div>
            <div id="contract-optional-fields" className={showContractFields ? 'mt-4 grid gap-4 sm:grid-cols-2' : 'hidden'}>
              <label className="text-sm font-medium">Fonction<input className={input} value={job} maxLength={160} onChange={e => { setJob(e.target.value); setApproved(false); setSign(false); }} /></label>
              <label className="text-sm font-medium">Lieu d’affectation<input className={input} value={location} maxLength={180} onChange={e => { setLocation(e.target.value); setApproved(false); setSign(false); }} /></label>
              <label className="text-sm font-medium">Date de prise d’effet<input className={input} type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setApproved(false); setSign(false); }} /></label>
              {kind === 'CDD' && <label className="text-sm font-medium">Date de fin<input className={input} type="date" value={endDate} min={startDate} onChange={e => { setEndDate(e.target.value); setApproved(false); setSign(false); }} /></label>}
              <label className="text-sm font-medium">Rémunération<input className={input} inputMode="decimal" value={salary} onChange={e => { setSalary(e.target.value); setApproved(false); setSign(false); }} placeholder="Montant" /></label>
              <label className="text-sm font-medium">Devise<select className={input} value={currency} onChange={e => { setCurrency(e.target.value as 'CDF' | 'USD'); setApproved(false); setSign(false); }}><option>CDF</option><option>USD</option></select></label>
              <div className="rounded-lg border bg-muted/30 p-3 sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Afficher sur le contrat</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  {([
                    ['job', 'Fonction'],
                    ['location', 'Lieu d’affectation'],
                    ['startDate', 'Date de prise d’effet'],
                    ['endDate', 'Date de fin'],
                    ['salary', 'Rémunération (montant et devise)'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={displayOptions[key]} onChange={e => { setDisplayOptions(v => ({ ...v, [key]: e.target.checked })); setApproved(false); setSign(false); }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section> : null}
          <section className="overflow-hidden rounded-xl border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 p-4 sm:px-5"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><PenLine className="h-4 w-4" /></span><h3 className="text-base font-bold">02 · Corps du contrat</h3></div><span className="text-xs tabular-nums text-muted-foreground">{clauses.length} / 15 000 caractères</span></div>
            <div role="toolbar" aria-label="Mise en forme du corps du contrat" className="flex flex-wrap items-center gap-1 border-b p-2 sm:px-4">
              {formats.map(item=><button key={item.command} type="button" title={item.title} aria-label={item.title} onMouseDown={e=>e.preventDefault()} onClick={()=>applyFormat(item.command)} className={`min-h-9 rounded-lg border px-2.5 text-sm hover:bg-muted ${item.command==='bold'?'font-bold':item.command==='italic'?'italic':''}`}>{item.label}</button>)}
            </div>
            <label className="block px-4 pt-3 text-sm font-medium sm:px-5" htmlFor="contract-body">Corps texte</label>
            <textarea id="contract-body" ref={clausesRef} className="min-h-80 w-full resize-y bg-background px-4 py-3 font-mono text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-5" value={clauses} maxLength={MAX_CONTRACT_CLAUSES} onChange={e => { setClauses(e.target.value); setApproved(false); setSign(false); }} placeholder="Saisissez les clauses vérifiées…" />
          </section>
          <section className="space-y-3 rounded-xl border p-4 sm:p-5">
            <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="h-4 w-4" /></span><h3 className="text-base font-bold">03 · Validation et visa</h3></div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={approved} onChange={e => { setApproved(e.target.checked); setSign(false); }} className="mt-1" /> Clauses, dates et montants validés pour ce contrat soumis au droit de la RDC.</label>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={authorized} onChange={e => { setAuthorized(e.target.checked); setSign(false); }} className="mt-1" /> J’ai vérifié l’habilitation du Directeur Général à représenter l’entreprise. La mention « dûment habilité à cet effet » sera alors imprimée sur le contrat.</label>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={sign} disabled={!approved || !authorized || !signature || !seal || !settings.directorName} onChange={e => setSign(e.target.checked)} className="mt-1" /> Après accord réel du DG, afficher son image de signature et le sceau.</label>
            <p className="text-xs text-muted-foreground">La signature image est uniquement visuelle. L’accord du collaborateur est recueilli par lui-même ; aucune signature électronique qualifiée n’est créée.</p>
          </section>
        </fieldset>
        <div className="flex flex-wrap items-center gap-2 border-t pt-5">
          {!locked&&<button type="button" disabled={busy} onClick={()=>void saveDraft()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"><Save className="h-4 w-4" />{selected?'Enregistrer les modifications':'Enregistrer le brouillon'}</button>}
          {!locked&&selected&&<button type="button" disabled={busy||!approved||!authorized||!sign} onClick={()=>void proposeCase()} className="inline-flex items-center gap-2 rounded-xl border border-primary px-4 py-2.5 text-sm font-bold text-primary disabled:opacity-50"><Send className="h-4 w-4" />Transmettre pour accord</button>}
          <button type="button" disabled={busy} onClick={() => void exportPdf()} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-50"><Download className="h-4 w-4" />{busy ? 'Préparation…' : locked?'Télécharger la version figée':'Télécharger le projet PDF'}</button>
          {!locked&&selected&&<button type="button" disabled={busy} onClick={()=>void archiveCase()} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm text-red-600 disabled:opacity-50"><Archive className="h-4 w-4" />Archiver le brouillon</button>}
        </div>
        <BrowserDocumentLink url={browserLink}/>
        <Link href="/rh/documents" className="inline-block text-sm font-semibold text-primary underline">Déposer la version signée dans Documents RH</Link>
      </div>}
      <aside className="space-y-5">
        {activeTab==='gestion'&&selected?.status==='pending_approval'&&<div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm text-blue-950"><h3 className="font-semibold">Signature soumise pour vérification</h3><p>Signataire : {selected.employeeSignature || '—'} · Mode : {selected.signatureMode==='text'?'texte':'image ou dessin'} · {selected.acceptedAt ? new Date(selected.acceptedAt).toLocaleString('fr-FR') : 'Date indisponible'}</p><p>Règles de l’entreprise : {selected.consentCompanyRules?'acceptées':'non confirmées'} · Conditions du travail : {selected.consentWorkRules?'acceptées':'non confirmées'}</p><p>Ouvrez le PDF signé et contrôlez les informations avant de cliquer sur Approuver.</p></div>}
        {activeTab==='gestion'&&selected&&<div className="rounded-xl border bg-card p-4 text-sm"><strong>Évolution du contrat : {selected.status==='accepted'&&!selected.approvedAt?'Accord enregistré (historique)':contractProgress(selected.status,selected.kind,selected.startDate,selected.endDate).label}</strong><p className="mt-1 text-muted-foreground">Brouillon → Transmis → Signé → Approuvé → Prise d’effet / terme</p>{contractProgress(selected.status,selected.kind,selected.startDate,selected.endDate).reminder&&<p role="alert" className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-900">{contractProgress(selected.status,selected.kind,selected.startDate,selected.endDate).reminder}</p>}</div>}
        {(activeTab==='redaction'||activeTab==='gestion'&&selected?.status!=='draft')&&<div className="space-y-3"><button type="button" aria-expanded={showPreview} onClick={()=>setShowPreview(value=>!value)} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted">{showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{showPreview?'Masquer l’aperçu du contrat':'Afficher l’aperçu du contrat A4'}</button>{showPreview&&<ContractPdfPreview bytes={previewPdf} status={previewStatus}/>}</div>}
        {activeTab==='configuration'&&<section className="rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-2"><h3 className="font-bold">Identité du document</h3><Link href="/rh/parametres" className="text-xs font-semibold text-primary underline">Configurer</Link></div>
          <div className="mt-3 flex items-center gap-3">{logo && <img src={logo} alt="Logo de l’entreprise" className="h-12 w-12 shrink-0 object-contain" />}<p className="font-semibold">{settings.companyName}</p></div>
          <dl className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            {settings.documentHeader && <div><dt className="inline font-semibold">En-tête : </dt><dd className="inline">{settings.documentHeader}</dd></div>}
            {settings.companyPhone && <div><dt className="inline font-semibold">Téléphone : </dt><dd className="inline">{settings.companyPhone}</dd></div>}
            {settings.companyEmail && <div><dt className="inline font-semibold">Courriel : </dt><dd className="inline">{settings.companyEmail}</dd></div>}
            {settings.companyRegistration && <div><dt className="inline font-semibold">RCCM : </dt><dd className="inline">{settings.companyRegistration}</dd></div>}
            {settings.documentFooter && <div><dt className="inline font-semibold">Pied de page : </dt><dd className="inline">{settings.documentFooter}</dd></div>}
          </dl>
        </section>}
        {activeTab==='gestion'&&<section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 p-4 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users className="h-4 w-4" /></span>
              <h3 className="font-bold">Dossiers de contrats</h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">{cases.length}</span>
            </div>
            <input value={contractQuery} onChange={event => setContractQuery(event.target.value)} placeholder="Rechercher un collaborateur, un type…" aria-label="Rechercher un contrat" className="min-h-9 w-full max-w-xs rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Collaborateur</th>
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                  <th className="px-4 py-2.5 font-semibold">Période</th>
                  <th className="px-4 py-2.5 font-semibold">Statut</th>
                  <th className="px-4 py-2.5 font-semibold">Version</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleCases.map(item => {
                  const progress = contractProgress(item.status, item.kind, item.startDate, item.endDate);
                  return <tr key={item.id} onClick={() => choose(item)} className={`cursor-pointer transition-colors ${selected?.id === item.id ? 'bg-primary/[0.07]' : 'hover:bg-muted/40'}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{item.firstName} {item.lastName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.jobTitle}</p>
                    </td>
                    <td className="px-4 py-3"><span className="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-bold">{item.kind}</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{item.startDate}{item.kind === 'CDD' && item.endDate ? ` → ${item.endDate}` : ''}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${statusTone(item.status)}`}>
                        {item.status === 'accepted' ? <CheckCircle2 className="h-3 w-3" /> : item.status === 'draft' ? <FileText className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                        {item.status === 'accepted' && !item.approvedAt ? 'Accord historique' : progress.label}
                      </span>
                      {progress.reminder && <p className="mt-1 max-w-52 text-[11px] font-semibold text-amber-700 dark:text-amber-300">{progress.reminder}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">v{item.version}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={event => { event.stopPropagation(); choose(item); setActiveTab(item.status === 'draft' ? 'redaction' : 'gestion'); }} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">
                        <PenLine className="h-3.5 w-3.5" /> {item.status === 'draft' ? 'Modifier' : 'Ouvrir'}
                      </button>
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          {!cases.length&&<p className="p-5 text-sm text-muted-foreground">Aucun dossier de contrat pour le moment.</p>}
          {cases.length>0&&!visibleCases.length&&<p className="p-5 text-sm text-muted-foreground">Aucun contrat ne correspond à cette recherche.</p>}
          {selected&&<div className="flex flex-wrap items-center gap-2 border-t bg-muted/20 p-4">
            <button type="button" onClick={()=>setActiveTab('redaction')} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><PenLine className="h-4 w-4" />{selected.status==='draft'?'Modifier le brouillon':'Consulter le contrat'}</button>
            {selected.status==='pending_approval'&&<button type="button" disabled={busy} onClick={()=>void approveCase()} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Approuver le contrat signé</button>}
            <Link href="/rh/documents" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary underline">Documents RH</Link>
          </div>}
        </section>}
        {activeTab==='configuration'&&<section className="rounded-xl border bg-muted/20 p-4"><h3 className="font-bold">Modèles de clauses</h3>
          <select aria-label="Choisir un modèle contractuel" disabled={locked||busy} className={input} value={selectedTemplate?.id??''} onChange={e=>{const item=templates.find(t=>t.id===e.target.value);if(item)applyTemplate(item);else{setSelectedTemplate(null);setTemplateTitle('');}}}><option value="">Nouvelle trame</option>{templates.map(t=><option key={t.id} value={t.id}>{t.kind} · {t.title} (v{t.version})</option>)}</select>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Lieu de signature · « Fait à »<input className={input} value={signaturePlace} maxLength={120} disabled={locked||busy} placeholder="Goma" onChange={e=>{setSignaturePlace(e.target.value);setApproved(false);setSign(false);}} /></label>
            <label className="text-sm font-medium">Date à imprimer · « le »<input className={input} type="date" value={signatureDate} disabled={locked||busy} onChange={e=>{setSignatureDate(e.target.value);setApproved(false);setSign(false);}} /></label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Ces valeurs sont copiées du modèle vers le dossier et figées à la transmission. Vérifiez la date réelle avant envoi.</p>
          <input className={input} aria-label="Nom du modèle contractuel" placeholder="Nom de la trame" maxLength={120} value={templateTitle} disabled={locked||busy} onChange={e=>setTemplateTitle(e.target.value)} />
          <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={locked||busy||!templateTitle.trim()||!clauses.trim()} onClick={()=>void saveTemplate()} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">{selectedTemplate?'Mettre à jour':'Enregistrer la trame'}</button>{selectedTemplate&&<button type="button" disabled={locked||busy} onClick={()=>void archiveTemplate()} className="rounded-lg border px-3 py-2 text-sm text-red-600 disabled:opacity-50">Archiver</button>}</div>
        </section>}
      </aside>
    </div>
  </div>;
}
