'use client';
import { BrowserDocumentLink } from './browser-document-link';
import { RhFormModal } from './rh-form-modal';
import { deliverRhDocument, inNativeRhApp } from '@/lib/redaction/rh/browser-document';
import { useRhNotice } from './use-rh-notice';

import { useEffect, useState, type ChangeEvent } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { COUNTRIES, LANGUAGES, RDC_PROVINCES } from '@/lib/redaction/rh/geo';
import { DEFAULT_ORGANIZATION_SETTINGS, type OrganizationSettings } from '@/lib/redaction/rh/organization';
import { renderEmployeeIdPage, IdPageOverflowError, type IdPage, type IdFieldGroup } from '@/lib/redaction/rh/employee-id-export';
import { createOrganizationQr } from '@/lib/redaction/rh/organization-qr';
import { Download, Printer, UserRoundPen, X, ImageDown, Maximize2 } from 'lucide-react';

type Person = { firstName: string; lastName: string; jobTitle: string; team: string; contractStatus: string; startDate: string | null };
type PersonalDetails = { birthDate: string; startDate: string; phone: string; email: string; address: string; country: string; province: string; city: string; emergencyContact: string; specialty: string; languages: string };

async function shareOrDownloadFile(blob: Blob, filename: string): Promise<string|null> {
  return deliverRhDocument(blob,filename);
}

export function EmployeeIdCard({ person, adminPersonId, serviceCard }: { person: Person; adminPersonId?: string; serviceCard?: { issuedAt: string; active: boolean } | null }) {
  const searchParams = useSearchParams();
  const [browserLink,setBrowserLink] = useState<string|null>(null);
  const [details, setDetails] = useState<PersonalDetails>({ birthDate: '', startDate: '', phone: '', email: '', address: '', country: COUNTRIES[0], province: 'Kinshasa', city: 'Kinshasa', emergencyContact: '', specialty: '', languages: '' });
  const [profileReady, setProfileReady] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [qrReady, setQrReady] = useState(false);
  const [photo, setPhoto] = useState('');
  const [seal, setSeal] = useState('');
  const [signature, setSignature] = useState('');
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<Record<string, string | null>>({});
  const [company, setCompany] = useState<OrganizationSettings>(DEFAULT_ORGANIZATION_SETTINGS);
  const [companyAssets, setCompanyAssets] = useState<Record<string, string | null>>({});
  const [companyQr, setCompanyQr] = useState('');
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [overflow, setOverflow] = useState(false);
  const [renderProblem, setRenderProblem] = useState('');
  const [zoomed, setZoomed] = useState(false);
  const [message, setMessage] = useRhNotice('auto');
  useEffect(() => {
    if (!zoomed) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setZoomed(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [zoomed]);
  useEffect(() => {
    if (!adminPersonId && searchParams.get('edit') === '1') setEditing(true);
  }, [searchParams, adminPersonId]);
  useEffect(() => {
    setProfileReady(false); setAssetsReady(false);
    const profileEndpoint = adminPersonId ? `/api/redaction/rh/fiche/${adminPersonId}` : '/api/redaction/rh/mon-espace/fiche';
    fetchRedaction(profileEndpoint, { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      const value = data.profile ?? {};
      setProfile(value); setProfileReady(true);
      setPhoto(value.photo ?? '');
      setSignature(value.signature ?? '');
      const country = (COUNTRIES as readonly string[]).includes(value.country) ? value.country : COUNTRIES[0];
      const province = country === COUNTRIES[0]
        ? (RDC_PROVINCES[value.province] ? value.province : 'Kinshasa')
        : value.province ?? '';
      const city = country === COUNTRIES[0]
        ? (RDC_PROVINCES[province]?.includes(value.city) ? value.city : RDC_PROVINCES[province]?.[0] ?? '')
        : value.city ?? '';
      setDetails((current) => ({ ...current, birthDate: value.birthDate ?? '', startDate: value.startDate ?? '', phone: value.phone ?? '', email: value.workEmail ?? '', address: value.address ?? '', country, province, city, emergencyContact: value.emergencyContact ?? '', specialty: value.specialty ?? '', languages: value.languages ?? '' }));
    }).catch(() => setMessage('Les informations complémentaires ne sont pas disponibles.'));
    const assetRequests: Promise<unknown>[] = [];
    assetRequests.push(fetchRedaction('/api/redaction/rh/organisation/assets/rh-seal', { cache: 'no-store' }).then(async (response) => { if (response.ok) { const data = await response.json(); setSeal(data.asset ?? ''); } }).catch(() => {}));
    assetRequests.push(fetchRedaction('/api/redaction/rh/organisation', { cache: 'no-store' }).then(async (response) => { if (response.ok) { const data = await response.json(); setCompany({ ...DEFAULT_ORGANIZATION_SETTINGS, ...data.settings }); } }).catch(() => {}));
    for (const key of ['company-logo', 'document-header', 'document-footer']) assetRequests.push(fetchRedaction(`/api/redaction/rh/organisation/assets/${key}`, { cache: 'no-store' }).then(async (response) => { if (response.ok) { const data = await response.json(); setCompanyAssets((current) => ({ ...current, [key]: data.asset ?? null })); } }).catch(() => {}));
    void Promise.allSettled(assetRequests).then(() => setAssetsReady(true));
  }, [adminPersonId]);

  useEffect(() => {
    let active = true; setQrReady(false);
    void createOrganizationQr(company).then((dataUrl) => { if (active) setCompanyQr(dataUrl); }).catch(() => { if (active) setCompanyQr(''); }).finally(() => { if (active) setQrReady(true); });
    return () => { active = false; };
  }, [company]);

  async function saveDetails() {
    setSaving(true); setMessage('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/mon-espace/fiche', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ birthDate: details.birthDate, startDate: details.startDate, phone: details.phone, workEmail: details.email, address: details.address, country: details.country, province: details.province, city: details.city, emergencyContact: details.emergencyContact, specialty: details.specialty, languages: details.languages, signature }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');
      setProfile(data.profile ?? {}); setMessage('Informations enregistrées.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Enregistrement impossible.'); }
    finally { setSaving(false); }
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 2_000_000) { setMessage('Choisissez une photo JPG, PNG ou WebP de 2 Mo maximum.'); input.value = ''; return; }
    const form = new FormData(); form.set('photo', file);
    setSaving(true); setMessage('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/mon-espace/fiche/photo', { method: 'POST', body: form });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Envoi impossible.');
      setPhoto(data.photo);
      setMessage('Photo enregistrée.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Envoi impossible.'); }
    finally { setSaving(false); input.value = ''; }
  }

  const groups: IdFieldGroup[] = [
    { title: 'Identité personnelle', fields: [
      { label: 'Nom complet', value: `${person.firstName} ${person.lastName}` },
      { label: 'Date de naissance', value: details.birthDate },
      { label: 'Pays', value: details.country },
      { label: 'Province', value: details.province },
      { label: 'Ville', value: details.city },
      { label: 'Adresse', value: details.address },
    ] },
    { title: 'Situation professionnelle', fields: [
      { label: 'Fonction', value: person.jobTitle },
      { label: 'Équipe / service', value: person.team },
      { label: 'Matricule', value: profile.employeeNumber },
      { label: 'Lieu d’affectation', value: profile.workLocation },
      { label: 'Statut', value: person.contractStatus },
      { label: 'Type de contrat', value: profile.contractType },
      { label: 'Date d’arrivée', value: profile.startDate ?? person.startDate },
      { label: 'Fin de contrat', value: profile.contractEndDate },
      { label: 'Spécialité', value: details.specialty },
    ] },
    { title: 'Coordonnées et contact d’urgence', fields: [
      { label: 'Téléphone', value: details.phone },
      { label: 'E-mail professionnel', value: details.email },
      { label: 'Contact d’urgence', value: details.emergencyContact },
      { label: 'Langues parlées', value: details.languages },
    ] },
  ];

  function pageData(): IdPage {
    return { firstName:person.firstName,lastName:person.lastName,groups,company,photo,seal,signature,qr:companyQr,assets:companyAssets };
  }
  const ready=profileReady && assetsReady && qrReady;
  useEffect(() => {
    if (!ready) {setPreview(null);return;}
    let active=true;
    const timer=window.setTimeout(() => {
      void renderEmployeeIdPage(pageData(),1).then(canvas => {
        if(active){setPreview(canvas.toDataURL('image/jpeg',.88));setOverflow(false);setRenderProblem('');}
      }).catch(error => {
        if(active){setPreview(null);setOverflow(error instanceof IdPageOverflowError);setRenderProblem(error instanceof Error?error.message:'Aperçu indisponible.');}
      });
    },300);
    return () => { active=false;window.clearTimeout(timer); };
  },[person,details,profile,photo,seal,signature,company,companyAssets,companyQr,ready]);

  const filename=`fiche-identification-${person.lastName.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`;
  async function exportFile(type:'pdf'|'png') {
    if (!ready) {setMessage('Attendez le chargement de la fiche complète avant l’export.');return;}
    setDownloading(true);setMessage('');
    try {
      const canvas=await renderEmployeeIdPage(pageData());
      if(type==='pdf') {
        const {jsPDF}=await import('jspdf');
        const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
        pdf.addImage(canvas.toDataURL('image/jpeg',.94),'JPEG',0,0,210,297,undefined,'FAST');
        setBrowserLink(await shareOrDownloadFile(pdf.output('blob'),`${filename}.pdf`));
      } else {
        const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('PNG indisponible.')),'image/png'));
        setBrowserLink(await shareOrDownloadFile(blob,`${filename}-300dpi.png`));
      }
      setMessage(`${type.toUpperCase()} A4 prêt. Vérifiez vos téléchargements ou choisissez « Enregistrer dans Fichiers ».`);
    } catch(error) { const message=error instanceof Error?error.message:'Export impossible sur cet appareil.';setOverflow(error instanceof IdPageOverflowError);setMessage(message); }
    finally {setDownloading(false);}
  }
  async function printPage() {
    if (!ready) {setMessage('Attendez le chargement de la fiche complète avant l’impression.');return;}
    setDownloading(true);setMessage('');
    try {
      const mobile=inNativeRhApp() || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
      const canvas=await renderEmployeeIdPage(pageData(),mobile?3:1.5);
      if (mobile) {
        const {jsPDF}=await import('jspdf');
        const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
        pdf.addImage(canvas.toDataURL('image/jpeg',.94),'JPEG',0,0,210,297,undefined,'FAST');
        setBrowserLink(await shareOrDownloadFile(pdf.output('blob'),`${filename}.pdf`));
        setMessage('Fiche PDF A4 prête : ouvrez-la depuis Fichiers pour imprimer ou choisissez Imprimer dans le partage.');
        return;
      }
      const url=canvas.toDataURL('image/jpeg',.9);
      await new Promise<void>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve();image.onerror=()=>reject(new Error('Aperçu indisponible.'));image.src=url;});
      flushSync(()=>{setPreview(url);setOverflow(false);});
      window.print();
    } catch(error) {setOverflow(error instanceof IdPageOverflowError);setMessage(error instanceof Error?error.message:'Impression impossible.');}
    finally {setDownloading(false);}
  }

  return <div className="mx-auto max-w-3xl space-y-4 p-2 sm:p-4 print:max-w-none print:p-0">
    <div className="flex flex-wrap justify-end gap-2 print:hidden">
      {!adminPersonId && <button type="button" onClick={() => setEditing((open) => !open)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold"><UserRoundPen className="h-4 w-4" />{editing ? 'Fermer le formulaire' : 'Compléter ma fiche'}</button>}
      <button type="button" disabled={downloading || !ready} onClick={() => void printPage()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold"><Printer className="h-4 w-4" /> Imprimer</button>
      <button type="button" disabled={downloading || !ready} onClick={() => void exportFile('pdf')} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Download className="h-4 w-4" />{downloading ? 'Préparation…' : 'Télécharger PDF'}</button>
      <button type="button" disabled={downloading || !ready} onClick={() => void exportFile('png')} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold disabled:opacity-50"><ImageDown className="h-4 w-4" />Télécharger PNG HD (300 dpi)</button>
    </div>
    {serviceCard && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">Carte de service déjà émise le {serviceCard.issuedAt}{serviceCard.active ? ' · active' : ' · expirée ou révoquée'}</p>}
    <BrowserDocumentLink url={browserLink}/>
    {message && !editing && <p role="status" className="rounded-xl border border-primary/15 bg-primary/[0.06] px-4 py-2.5 text-sm text-primary print:hidden">{message}</p>}
    {!adminPersonId && <RhFormModal open={editing} busy={saving} onClose={() => setEditing(false)} width="max-w-3xl">
      <section role="dialog" aria-modal="true" aria-labelledby="employee-profile-form-title" className="min-h-0 w-full overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
        <header className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6">
          <div><p className="text-[10px] font-bold uppercase tracking-widest text-primary">Mon espace RH</p><h2 id="employee-profile-form-title" className="mt-0.5 font-display text-lg font-bold">Compléter ma fiche</h2></div>
          <button type="button" onClick={() => setEditing(false)} aria-label="Fermer le formulaire" className="rounded-full border border-border p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </header>
        <form onSubmit={(event) => { event.preventDefault(); void saveDetails(); }} className="grid gap-3 sm:grid-cols-2">
          {([['birthDate','Date de naissance'],['startDate','Date d’arrivée'],['phone','Téléphone'],['email','Adresse e-mail professionnelle'],['address','Adresse'],['emergencyContact','Contact d’urgence'],['specialty','Spécialité']] as const).map(([key,label]) => <label key={key} className="text-sm font-medium">{label}<input type={key === 'birthDate' || key === 'startDate' ? 'date' : key === 'email' ? 'email' : 'text'} value={details[key]} onChange={(e) => setDetails((current) => ({ ...current, [key]: e.target.value }))} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2.5" /></label>)}
          <label className="text-sm font-medium">Pays<select value={details.country} onChange={(event) => { const country = event.target.value; setDetails((current) => ({ ...current, country, province: country === COUNTRIES[0] ? (current.province || 'Kinshasa') : '', city: country === COUNTRIES[0] ? (current.city || 'Kinshasa') : '' })); }} className="mt-1 block min-h-11 w-full touch-manipulation rounded-lg border border-border bg-background px-3 py-2.5 text-base">{COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}</select></label>
          {details.country === COUNTRIES[0] ? <>
            <label className="text-sm font-medium">Province<select value={details.province} onChange={(event) => { const province = event.target.value; setDetails((current) => ({ ...current, province, city: RDC_PROVINCES[province]?.[0] ?? '' })); }} className="mt-1 block min-h-11 w-full touch-manipulation rounded-lg border border-border bg-background px-3 py-2.5 text-base">{Object.keys(RDC_PROVINCES).map((province) => <option key={province} value={province}>{province}</option>)}</select></label>
            <label className="text-sm font-medium">Ville<select value={details.city} onChange={(event) => setDetails((current) => ({ ...current, city: event.target.value }))} className="mt-1 block min-h-11 w-full touch-manipulation rounded-lg border border-border bg-background px-3 py-2.5 text-base">{(RDC_PROVINCES[details.province] ?? []).map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
          </> : <>
            <label className="text-sm font-medium">Province / région<input value={details.province} onChange={(event) => setDetails((current) => ({ ...current, province: event.target.value }))} className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base" /></label>
            <label className="text-sm font-medium">Ville<input value={details.city} onChange={(event) => setDetails((current) => ({ ...current, city: event.target.value }))} className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base" /></label>
          </>}
          <fieldset className="rounded-xl border border-border p-3 sm:col-span-2"><legend className="px-1 text-sm font-medium">Langues parlées <span className="font-normal text-muted-foreground">(plusieurs choix possibles)</span></legend><div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">{LANGUAGES.map((language) => { const selected = details.languages.split(', ').filter(Boolean).includes(language); return <label key={language} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/[0.06]"><input type="checkbox" checked={selected} onChange={(event) => { const checked = event.currentTarget.checked; setDetails((current) => { const chosen = new Set(current.languages.split(', ').filter(Boolean)); if (checked) chosen.add(language); else chosen.delete(language); return { ...current, languages: LANGUAGES.filter((item) => chosen.has(item)).join(', ') }; }); }} className="h-4 w-4 accent-primary" />{language}</label>; })}</div></fieldset>
          <label className="text-sm font-medium sm:col-span-2">Photo (JPG, PNG ou WebP, 2 Mo max)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} className="mt-1 block w-full rounded-lg border border-border bg-background p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary-foreground" /></label>
          <label className="text-sm font-medium sm:col-span-2">Signature (nom à afficher)<input maxLength={120} value={signature} onChange={(event) => setSignature(event.target.value)} placeholder="Saisir votre signature" className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2.5" /></label>
          {message && <p role="status" className="rounded-lg bg-primary/[0.06] p-3 text-sm text-primary sm:col-span-2">{message}</p>}
          <button type="submit" disabled={saving} className="sticky bottom-0 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg disabled:opacity-50 sm:col-span-2">{saving ? 'Enregistrement…' : 'Enregistrer mes informations'}</button>
        </form>
      </section>
    </RhFormModal>}
    {overflow && <p role="alert" className="rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950 print:hidden">La fiche ne tient pas sur une seule page A4 lisible. Aucun champ ne sera tronqué : raccourcissez les valeurs trop longues ou les textes de l’entreprise.</p>}
    {preview ? <button type="button" onClick={() => setZoomed(true)} className="mx-auto block w-full max-w-[210mm] text-left print:contents" aria-label="Agrandir la fiche d’identification A4"><img className="employee-id-print-page block h-auto w-full bg-white shadow-lg ring-1 ring-black/10 print:shadow-none print:ring-0" src={preview} alt={`Fiche d’identification A4 de ${person.firstName} ${person.lastName}`} /><span className="mt-2 flex items-center gap-2 text-xs text-muted-foreground print:hidden"><Maximize2 className="h-4 w-4"/>Toucher pour agrandir la fiche</span></button> : <div className="mx-auto flex aspect-[210/297] max-w-[210mm] items-center justify-center rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground print:hidden">{renderProblem || 'Préparation de l’aperçu A4…'}</div>}
    <dl className="sr-only">{groups.flatMap(group=>group.fields.map(field=><div key={`${group.title}-${field.label}`}><dt>{field.label}</dt><dd>{field.value||'Non renseigné'}</dd></div>))}</dl>
    {zoomed && preview && <div role="dialog" aria-modal="true" aria-label="Aperçu agrandi de la fiche" className="fixed inset-0 z-[120] overflow-auto bg-black/90 p-4 print:hidden" onMouseDown={event=>{if(event.target===event.currentTarget)setZoomed(false);}}><div className="sticky top-0 z-10 mb-3 flex justify-end"><button type="button" onClick={()=>setZoomed(false)} className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-black">Fermer</button></div><img src={preview} alt={`Fiche d’identification A4 agrandie de ${person.firstName} ${person.lastName}`} className="mx-auto h-auto min-w-[826px] max-w-[826px] bg-white" /></div>}
    <style jsx global>{`@media print { @page { size:A4; margin:0; } html,body {height:297mm!important;overflow:hidden!important;} body * {visibility:hidden!important;} .employee-id-print-page {visibility:visible!important;position:fixed!important;top:0!important;left:0!important;width:210mm!important;height:297mm!important;max-width:none!important;margin:0!important;} }`}</style>
  </div>;
}
