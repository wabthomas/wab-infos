'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { COUNTRIES, LANGUAGES, RDC_PROVINCES } from '@/lib/redaction/rh/geo';
import { DEFAULT_ORGANIZATION_SETTINGS, type OrganizationSettings } from '@/lib/redaction/rh/organization';
import { createOrganizationQr } from '@/lib/redaction/rh/organization-qr';
import { Download, Printer, UserRoundPen, X } from 'lucide-react';

type Person = { firstName: string; lastName: string; jobTitle: string; team: string; contractStatus: string; startDate: string | null };
type Field = { label: string; value: string | null | undefined };
type FieldGroup = { title: string; fields: Field[] };
type PersonalDetails = { birthDate: string; startDate: string; phone: string; email: string; address: string; country: string; province: string; city: string; emergencyContact: string; specialty: string; languages: string };

function dataUrlAsJpeg(source: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!source.startsWith('data:image/')) return resolve(null);
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) return resolve(null);
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch { resolve(null); }
    };
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

async function shareOrDownloadPdf(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Fiche d’identification' });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      // Si le navigateur refuse la feuille de partage, proposer le téléchargement standard.
    }
  }
  const androidBridge = (window as unknown as { AndroidBridge?: { savePdf?: (data: string, name: string) => void } }).AndroidBridge;
  if (androidBridge?.savePdf) {
    const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] ?? ''); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
    androidBridge.savePdf(base64, filename);
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function EmployeeIdCard({ person, adminPersonId }: { person: Person; adminPersonId?: string }) {
  const searchParams = useSearchParams();
  const [details, setDetails] = useState<PersonalDetails>({ birthDate: '', startDate: '', phone: '', email: '', address: '', country: COUNTRIES[0], province: 'Kinshasa', city: 'Kinshasa', emergencyContact: '', specialty: '', languages: '' });
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
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!adminPersonId && searchParams.get('edit') === '1') setEditing(true);
  }, [searchParams, adminPersonId]);
  useEffect(() => {
    const profileEndpoint = adminPersonId ? `/api/redaction/rh/fiche/${adminPersonId}` : '/api/redaction/rh/mon-espace/fiche';
    fetchRedaction(profileEndpoint, { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      const value = data.profile ?? {};
      setProfile(value);
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
    fetchRedaction('/api/redaction/rh/organisation/assets/rh-seal', { cache: 'no-store' }).then(async (response) => { if (response.ok) { const data = await response.json(); setSeal(data.asset ?? ''); } }).catch(() => {});
    fetchRedaction('/api/redaction/rh/organisation', { cache: 'no-store' }).then(async (response) => { if (response.ok) { const data = await response.json(); setCompany({ ...DEFAULT_ORGANIZATION_SETTINGS, ...data.settings }); } }).catch(() => {});
    for (const key of ['company-logo', 'document-header', 'document-footer']) fetchRedaction(`/api/redaction/rh/organisation/assets/${key}`, { cache: 'no-store' }).then(async (response) => { if (response.ok) { const data = await response.json(); setCompanyAssets((current) => ({ ...current, [key]: data.asset ?? null })); } }).catch(() => {});
  }, [adminPersonId]);

  useEffect(() => {
    let active = true;
    void createOrganizationQr(company).then((dataUrl) => { if (active) setCompanyQr(dataUrl); }).catch(() => { if (active) setCompanyQr(''); });
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

  const groups: FieldGroup[] = [
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

  async function downloadPdf() {
    setDownloading(true); setMessage('');
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const logo = await dataUrlAsJpeg(companyAssets['company-logo'] || '');
      const sealImage = await dataUrlAsJpeg(seal);
      const qrImage = companyQr || await createOrganizationQr(company);
      const photoImage = await dataUrlAsJpeg(photo);
      const headerImage = await dataUrlAsJpeg(companyAssets['document-header'] || '');
      const footerImage = await dataUrlAsJpeg(companyAssets['document-footer'] || '');
      pdf.setFillColor(25, 25, 35); pdf.rect(0, 0, pageWidth, 5, 'F');
      if (headerImage) pdf.addImage(headerImage, 'JPEG', margin, 10, 70, 14, undefined, 'FAST');
      else if (logo) pdf.addImage(logo, 'JPEG', margin, 9, 24, 20, undefined, 'FAST');
      const photoX = pageWidth - margin - 27;
      if (photoImage) pdf.addImage(photoImage, 'JPEG', photoX, 10, 27, 32, undefined, 'FAST');
      else { pdf.setDrawColor(200); pdf.roundedRect(photoX, 10, 27, 32, 2, 2); }
      const companyTextX = logo || headerImage ? margin + 29 : margin;
      pdf.setTextColor(90); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8);
      pdf.text(company.companyName || 'Wab-infos', companyTextX, 32);
      const companyContacts = [company.companyAddress, company.companyPhone, company.companyEmail].filter(Boolean).join(' · ');
      if (companyContacts) { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.text(pdf.splitTextToSize(companyContacts, photoX - companyTextX - 5), companyTextX, 37); }
      pdf.setTextColor(25, 25, 35); pdf.setFontSize(17); pdf.text('FICHE D’IDENTIFICATION', margin, 48);
      pdf.setDrawColor(196, 30, 58); pdf.setLineWidth(1.2); pdf.line(margin, 52, pageWidth - margin, 52);
      let y = 58;
      for (const group of groups) {
        const rows = Math.ceil(group.fields.length / 2);
        const groupHeight = 9 + rows * 12 + 3;
        if (y + groupHeight + 45 > 282) { pdf.addPage(); y = 18; }
        pdf.setFillColor(245, 246, 248); pdf.roundedRect(margin, y, pageWidth - margin * 2, 7, 1.5, 1.5, 'F');
        pdf.setTextColor(45, 49, 58); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.text(group.title.toUpperCase(), margin + 3, y + 4.8);
        y += 11;
        group.fields.forEach((field, index) => {
          const column = index % 2;
          const x = margin + column * ((pageWidth - margin * 2) / 2);
          const row = Math.floor(index / 2);
          const fieldY = y + row * 12;
          pdf.setTextColor(120); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.text(field.label.toUpperCase(), x + 1, fieldY);
          pdf.setTextColor(35, 39, 48); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9);
          const valueLines = pdf.splitTextToSize(field.value || '—', (pageWidth - margin * 2) / 2 - 8) as string[];
          pdf.text(valueLines.slice(0, 2), x + 1, fieldY + 4.5);
        });
        y += rows * 12 + 4;
      }
      const stampY = Math.min(Math.max(y + 3, 224), 232);
      if (sealImage) pdf.addImage(sealImage, 'JPEG', pageWidth / 2 - 17, stampY, 34, 34, undefined, 'FAST');
      else { pdf.setDrawColor(185, 190, 200); pdf.setLineDashPattern([1, 1], 0); pdf.circle(pageWidth / 2, stampY + 17, 15); pdf.setLineDashPattern([], 0); }
      if (qrImage) {
        pdf.addImage(qrImage, 'PNG', pageWidth / 2 + 21, stampY + 5, 24, 24, undefined, 'FAST');
        pdf.setTextColor(100); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(5.5);
        pdf.text('Identité entreprise', pageWidth / 2 + 33, stampY + 32, { align: 'center' });
      }
      if (signature) {
        pdf.setTextColor(25, 45, 90); pdf.setFont('times', 'italic'); pdf.setFontSize(14);
        pdf.text(signature, pageWidth / 2, stampY + 23, { align: 'center', angle: -12, maxWidth: 37 });
      }
      pdf.setTextColor(110); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7);
      pdf.text('Signature du collaborateur', margin, stampY + 39);
      pdf.text('Validation RH', pageWidth - margin, stampY + 39, { align: 'right' });
      if (footerImage) pdf.addImage(footerImage, 'JPEG', margin, 270, 35, 10, undefined, 'FAST');
      const footerText = company.documentFooter || 'Document interne · Ressources humaines';
      pdf.setTextColor(130); pdf.setFontSize(6.5); pdf.text(pdf.splitTextToSize(footerText, pageWidth - margin * 2), margin, 286);
      const filename = `fiche-identification-${person.lastName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
      await shareOrDownloadPdf(pdf.output('blob'), filename);
      setMessage('Le PDF est prêt. Vérifiez vos téléchargements ou choisissez « Enregistrer dans Fichiers ».');
    } catch (error) {
      setMessage(error instanceof Error ? `Téléchargement PDF impossible : ${error.message}` : 'Téléchargement PDF impossible.');
    } finally { setDownloading(false); }
  }

  return <div className="mx-auto max-w-3xl space-y-4 p-2 sm:p-4 print:max-w-none print:p-0">
    <div className="flex flex-wrap justify-end gap-2 print:hidden">
      {!adminPersonId && <button type="button" onClick={() => setEditing((open) => !open)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold"><UserRoundPen className="h-4 w-4" />{editing ? 'Fermer le formulaire' : 'Compléter ma fiche'}</button>}
      <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold"><Printer className="h-4 w-4" /> Imprimer</button>
      <button type="button" disabled={downloading} onClick={() => void downloadPdf()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Download className="h-4 w-4" />{downloading ? 'Préparation…' : 'Télécharger PDF'}</button>
    </div>
    {message && !editing && <p role="status" className="rounded-xl border border-primary/15 bg-primary/[0.06] px-4 py-2.5 text-sm text-primary print:hidden">{message}</p>}
    {editing && !adminPersonId && <div className="fixed inset-0 z-[85] flex items-end bg-black/55 print:hidden sm:items-center sm:justify-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditing(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="employee-profile-form-title" className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:p-6">
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
          <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">Les informations personnelles sont enregistrées dans votre dossier RH. Les données administratives restent gérées par l’administration.</p>
          <button type="submit" disabled={saving} className="sticky bottom-0 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg disabled:opacity-50 sm:col-span-2">{saving ? 'Enregistrement…' : 'Enregistrer mes informations'}</button>
        </form>
      </section>
    </div>}
    <article className="employee-id-card mx-auto max-w-3xl rounded-2xl border border-border bg-white p-4 text-[#191923] shadow-sm sm:p-8 print:max-w-none print:break-inside-avoid print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <header className="flex items-center justify-between gap-3 border-b-4 border-[#191923] pb-4 sm:gap-6 sm:pb-5 print:gap-6">
        <div className="min-w-0 flex-1">{companyAssets['document-header'] ? <img src={companyAssets['document-header']!} alt="Entête" className="mb-2 max-h-10 max-w-full object-contain object-left" /> : <img src={companyAssets['company-logo'] || '/logo.png'} alt={company.companyName || 'Wab-infos'} className="mb-2 h-9 max-w-36 object-contain object-left" />}<p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{company.companyName || 'Wab-infos'}</p><h1 className="mt-0.5 text-lg font-bold leading-tight sm:text-2xl">Fiche d’identification</h1><p className="mt-1 text-[10px] text-zinc-500 sm:text-xs">{company.documentHeader || 'Document interne · ressources humaines'}</p><p className="mt-1 text-[9px] text-zinc-400">{[company.companyAddress, company.companyPhone, company.companyEmail].filter(Boolean).join(' · ')}</p></div>
        <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-300 bg-zinc-100 shadow-sm sm:h-24 sm:w-20 print:h-24 print:w-20">{photo ? <img src={photo} alt="Photo du collaborateur" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl font-bold text-zinc-400">{person.firstName[0]}{person.lastName[0]}</div>}</div>
      </header>
      <div className="mt-4 space-y-4 sm:mt-5 sm:space-y-5">
        {groups.map((group) => <section key={group.title} className="break-inside-avoid">
          <h2 className="rounded-lg bg-zinc-100 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-700 sm:text-[11px]">{group.title}</h2>
          <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
            {group.fields.map((field) => <div key={field.label} className="min-w-0 rounded-lg border border-zinc-100 bg-zinc-50/70 px-2.5 py-2 sm:px-3 sm:py-2.5">
              <dt className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 sm:text-[10px]">{field.label}</dt>
              <dd className="mt-1 break-words text-xs font-semibold leading-4 text-zinc-800 sm:text-[13px] sm:leading-5">{field.value || '—'}</dd>
            </div>)}
          </dl>
        </section>)}
      </div>
      <div className="mt-5 grid grid-cols-3 items-center gap-2 border-t border-zinc-200 pt-3 text-center text-[9px] text-zinc-500 sm:mt-7 sm:pt-4 sm:text-[10px] print:break-inside-avoid">
        <p className="uppercase tracking-wider">Signature du collaborateur</p>
        <div className="mx-auto flex items-center gap-1.5 sm:gap-2">
          <div className="relative flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
            {seal ? <img src={seal} alt="Sceau officiel RH" className="absolute inset-0 h-full w-full object-contain" /> : <span className="rounded-full border-2 border-dashed border-zinc-300 px-2 py-8 text-[9px]">Sceau RH</span>}
            {signature && <span className="absolute left-1/2 top-[62%] z-10 w-max max-w-[115%] -translate-x-1/2 -translate-y-1/2 -rotate-12 break-words px-2 font-serif text-sm italic text-blue-900 sm:text-base">{signature}</span>}
          </div>
          {companyQr && <div className="flex shrink-0 flex-col items-center gap-0.5"><img src={companyQr} alt="QR code des coordonnées de l’entreprise" className="h-12 w-12 rounded border border-zinc-200 bg-white p-0.5 sm:h-14 sm:w-14 print:h-[17mm] print:w-[17mm]" /><span className="max-w-14 text-[6px] leading-tight text-zinc-500">Identité entreprise</span></div>}
        </div>
        <p className="uppercase tracking-wider">Validation RH</p>
      </div>
      <footer className="mt-3 border-t border-zinc-200 pt-2.5 text-[9px] leading-4 text-zinc-400 sm:mt-4 sm:pt-3 sm:text-[10px]">{companyAssets['document-footer'] && <img src={companyAssets['document-footer']!} alt="Pied de page" className="mb-2 max-h-10 max-w-full object-contain object-left" />}<p>{company.documentFooter || 'Fiche d’identification personnelle. Les dates et coordonnées communiquées sont enregistrées dans votre dossier ; les champs administratifs restent sous la responsabilité de l’administration RH.'}</p><p className="mt-1">{company.companyPhone} {company.companyEmail && `· ${company.companyEmail}`}</p></footer>
    </article>
  </div>;
}
