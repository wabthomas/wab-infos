'use client';

import { useEffect, useState } from 'react';
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
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ format: 'a4', unit: 'mm', compress: true });
      const width = 170; let y = 34;
      const newPage = () => { pdf.addPage(); y = 28; };
      const write = (value: string, size = 11, bold = false, gap = 4) => {
        pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size);
        for (const paragraph of value.replace(/\r\n?/g,'\n').split('\n')) {
          const lines = paragraph ? pdf.splitTextToSize(paragraph, width) as string[] : [''];
          for (const line of lines) { if (y > 265) newPage(); pdf.text(line, 20, y); y += size * .45 + 2; }
          y += gap;
        }
      };
      pdf.setTextColor(36,36,45);
      write(settings.companyName || 'Entreprise', 16, true);
      write([settings.companyAddress, settings.documentHeader].filter(Boolean).join(' · '), 9);
      pdf.setDrawColor(158,38,70); pdf.line(20, y, 190, y); y += 14;
      write(`PROJET DE CONTRAT ${kind}`, 16, true, 8);
      write(`Employeur : ${settings.companyName}`, 11, true);
      write(`Collaborateur : ${person.firstName} ${person.lastName}`, 11, true);
      write(`Fonction : ${job.trim()} · Lieu : ${location.trim()}`);
      write(`Prise d'effet : ${startDate}${kind === 'CDD' ? ` · Date de fin indiquée : ${endDate}` : ''}`);
      write(`Rémunération déclarée : ${salary.replace(',','.')} ${currency} (périodicité et modalités à préciser dans les clauses)`, 10);
      y += 8; write('CLAUSES VALIDÉES PAR LA DIRECTION', 12, true, 5);
      write(clauses.trim(), 11, false, 6);
      if (y > 224) newPage();
      y += 10;
      const imgSeal = sign ? await png(seal, .22) : null, imgSignature = sign ? await png(signature) : null;
      if (imgSeal) pdf.addImage(imgSeal, 'PNG', 112, y - 3, 29, 29);
      pdf.setFontSize(9); pdf.text(`Pour ${settings.companyName}`, 110, y);
      if (imgSignature) pdf.addImage(imgSignature, 'PNG', 110, y + 3, Math.min(48, Number(settings.directorSignatureWidth) / 4), Math.min(23, Number(settings.directorSignatureHeight) / 4));
      pdf.text(`${settings.directorName || 'Nom du DG'} · ${settings.directorTitle || 'Direction générale'}`, 110, y + 34);
      pdf.text(`Signature du collaborateur : ${person.firstName} ${person.lastName}`, 20, y + 34);
      for (let i = 1; i <= pdf.getNumberOfPages(); i++) {
        pdf.setPage(i); pdf.setDrawColor(210); pdf.line(20, 280, 190, 280);
        pdf.setFontSize(8); pdf.setTextColor(85);
        pdf.text(settings.documentFooter || 'Document RH privé', 20, 286, { maxWidth: 145 });
        pdf.text(`${i} / ${pdf.getNumberOfPages()}`, 190, 286, { align: 'right' });
        if (!sign) { pdf.setTextColor(158,38,70); pdf.text('PROJET NON SIGNÉ', 190, 13, { align: 'right' }); }
      }
      pdf.save(`projet-contrat-${kind.toLowerCase()}-${person.lastName.replace(/[^a-zA-Z0-9-]/g,'-')}.pdf`);
      toast.success('Projet PDF prêt. Déposez la version signée dans Documents RH après contrôle.');
    } catch { setError('Génération PDF impossible.'); toast.error('Génération PDF impossible.'); }
    finally { setBusy(false); }
  }
  const locked=Boolean(selected && selected.status!=='draft');
  const input = 'mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm';
  return <div className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-7">
    <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Contrats RH · RDC</p><h2 className="mt-2 text-2xl font-bold">Préparer un CDD ou un CDI</h2><p className="mt-2 text-sm text-muted-foreground">Préparation PDF multi-pages. Aucune durée, clause ou règle de droit congolais n’est présumée : faites valider le texte par un juriste avant utilisation.</p></div>
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Dossiers contractuels enregistrés</h3><button type="button" className="rounded-lg border px-3 py-2 text-sm font-semibold" onClick={()=>newCase()}>Nouveau contrat</button></div>
      <div className="mt-3 grid max-h-56 gap-2 overflow-auto sm:grid-cols-2">{cases.map(item=><button type="button" key={item.id} onClick={()=>choose(item)} aria-pressed={selected?.id===item.id} className={`rounded-xl border p-3 text-left text-sm ${selected?.id===item.id?'border-primary bg-primary/10':'bg-card hover:border-primary/40'}`}><strong>{item.kind} · {item.firstName} {item.lastName}</strong><span className="mt-1 block text-xs text-muted-foreground">{item.jobTitle} · {item.status==='draft'?'Brouillon':item.status==='proposed'?'À examiner':'Accord enregistré'} · v{item.version}</span></button>)}</div>
      {!cases.length&&<p className="mt-3 text-sm text-muted-foreground">Aucun contrat sauvegardé.</p>}
    </div>
    <section className="rounded-xl border bg-muted/30 p-4">
      <h3 className="font-bold">Modèles de clauses CDD / CDI</h3><p className="mt-1 text-xs text-muted-foreground">Trames privées, versionnées et archivables. Aucune clause n’est fournie comme conseil juridique.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr]"><select aria-label="Choisir un modèle contractuel" disabled={locked||!!busy} className={input + ' mt-0'} value={selectedTemplate?.id??''} onChange={e=>{const item=templates.find(t=>t.id===e.target.value);if(item)applyTemplate(item);else{setSelectedTemplate(null);setTemplateTitle('');}}}><option value="">Nouvelle trame</option>{templates.map(t=><option key={t.id} value={t.id}>{t.kind} · {t.title} (v{t.version})</option>)}</select><input className={input + ' mt-0'} aria-label="Nom du modèle contractuel" placeholder="Nom de la trame validée" maxLength={120} value={templateTitle} disabled={locked||!!busy} onChange={e=>setTemplateTitle(e.target.value)} /></div>
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={locked||!!busy||!templateTitle.trim()||!clauses.trim()} onClick={()=>void saveTemplate()} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">{selectedTemplate?'Mettre à jour la trame':'Enregistrer la trame'}</button>{selectedTemplate&&<button type="button" disabled={locked||!!busy} onClick={()=>void archiveTemplate()} className="rounded-lg border px-3 py-2 text-sm text-red-600 disabled:opacity-50">Archiver la trame</button>}</div>
    </section>
    <fieldset disabled={locked||busy} className="space-y-5 disabled:opacity-70"><div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">Collaborateur<select className={input} disabled={!!selected} value={personId} onChange={e => changePerson(e.target.value)}><option value="">Sélectionner…</option>{people.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}</select></label>
      <label className="text-sm font-medium">Type de contrat<select className={input} value={kind} onChange={e => { setKind(e.target.value as 'CDD' | 'CDI'); setApproved(false); setSign(false); }}><option value="CDD">CDD</option><option value="CDI">CDI</option></select></label>
      <label className="text-sm font-medium">Fonction<input className={input} value={job} maxLength={160} onChange={e => { setJob(e.target.value); setApproved(false); setSign(false); }} /></label>
      <label className="text-sm font-medium">Lieu d’affectation<input className={input} value={location} maxLength={180} onChange={e => { setLocation(e.target.value); setApproved(false); setSign(false); }} /></label>
      <label className="text-sm font-medium">Date de prise d’effet<input className={input} type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setApproved(false); setSign(false); }} /></label>
      {kind === 'CDD' && <label className="text-sm font-medium">Date de fin indiquée<input className={input} type="date" value={endDate} min={startDate} onChange={e => { setEndDate(e.target.value); setApproved(false); setSign(false); }} /></label>}
      <label className="text-sm font-medium">Rémunération indiquée<input className={input} inputMode="decimal" value={salary} onChange={e => { setSalary(e.target.value); setApproved(false); setSign(false); }} placeholder="Montant" /></label>
      <label className="text-sm font-medium">Devise<select className={input} value={currency} onChange={e => { setCurrency(e.target.value as 'CDF' | 'USD'); setApproved(false); setSign(false); }}><option>CDF</option><option>USD</option></select></label>
    </div>
    <label className="block text-sm font-medium">Clauses contractuelles validées<textarea className={input + ' min-h-72'} value={clauses} maxLength={12000} onChange={e => { setClauses(e.target.value); setApproved(false); setSign(false); }} placeholder="Collez ici uniquement des clauses approuvées par votre conseil juridique…" /></label>
    <p className="rounded-xl bg-amber-500/10 p-3 text-sm">Ce PDF est préparatoire. La signature image du DG n’est qu’une reproduction visuelle ; elle ne prouve pas son consentement. La signature du collaborateur reste à recueillir par lui-même, jamais par l’administrateur.</p>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={approved} onChange={e => { setApproved(e.target.checked); setSign(false); }} className="mt-1" /> Je confirme avoir fait valider les clauses, dates et montants pour ce contrat soumis au droit de la RDC.</label>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={sign} disabled={!approved || !signature || !seal || !settings.directorName} onChange={e => setSign(e.target.checked)} className="mt-1" /> Après accord réel du DG, afficher son image de signature et le sceau de l’entreprise.</label>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex flex-wrap items-center gap-3">
      {!locked&&<button type="button" disabled={busy} onClick={()=>void saveDraft()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{selected?'Enregistrer les modifications':'Enregistrer le brouillon'}</button>}
      {!locked&&selected&&<button type="button" disabled={busy||!approved||!sign} onClick={()=>void proposeCase()} className="rounded-xl border border-primary px-4 py-2.5 text-sm font-bold text-primary disabled:opacity-50">Transmettre pour accord</button>}
      {!locked&&selected&&<button type="button" disabled={busy} onClick={()=>void archiveCase()} className="rounded-xl border px-4 py-2.5 text-sm text-red-600 disabled:opacity-50">Archiver le brouillon</button>}
      <button type="button" disabled={busy} onClick={() => void exportPdf()} className="rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-50">{busy ? 'Préparation…' : locked?'Télécharger la version figée':'Télécharger le projet PDF'}</button><Link href="/rh/documents" className="text-sm font-semibold text-primary underline">Déposer la version signée dans Documents RH</Link></div>
    <p className="text-xs text-muted-foreground">Les brouillons sont enregistrés sur le serveur ; seul le collaborateur lié reçoit une version figée après transmission. Après son accord visuel, le PDF final est généré et conservé côté serveur. Aucune signature électronique qualifiée : ne pas présenter ce processus comme une preuve légale suffisante sans validation juridique en RDC.</p>
  </div>;
}
