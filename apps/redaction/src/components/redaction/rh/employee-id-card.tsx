'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { COUNTRIES, LANGUAGES, RDC_PROVINCES } from '@/lib/redaction/rh/geo';
import { Printer, UserRoundPen } from 'lucide-react';

type Person = { firstName: string; lastName: string; jobTitle: string; team: string; contractStatus: string; startDate: string | null };
export function EmployeeIdCard({ person }: { person: Person }) {
  const [details, setDetails] = useState({ birthDate: '', startDate: '', phone: '', email: '', address: '', country: COUNTRIES[0], province: 'Kinshasa', city: 'Kinshasa', emergencyContact: '', specialty: '', languages: '' });
  const [photo, setPhoto] = useState('');
  const [seal, setSeal] = useState('');
  const [signature, setSignature] = useState('');
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    fetchRedaction('/api/redaction/rh/mon-espace/fiche', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      const value = data.profile ?? {};
      setProfile(value);
      setPhoto(value.photo ?? '');
      setSignature(value.signature ?? '');
      setDetails((current) => ({ ...current, birthDate: value.birthDate ?? '', startDate: value.startDate ?? '', phone: value.phone ?? '', email: value.workEmail ?? '', address: value.address ?? '', country: value.country ?? COUNTRIES[0], province: value.province ?? 'Kinshasa', city: value.city ?? 'Kinshasa', emergencyContact: value.emergencyContact ?? '', specialty: value.specialty ?? '', languages: value.languages ?? '' }));
    }).catch(() => setMessage('Les informations complémentaires ne sont pas disponibles.'));
    fetchRedaction('/api/redaction/rh/sceau', { cache: 'no-store' }).then(async (response) => { if (response.ok) { const data = await response.json(); setSeal(data.seal ?? ''); } }).catch(() => {});
  }, []);
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
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 2_000_000) { setMessage('Choisissez une photo JPG, PNG ou WebP de 2 Mo maximum.'); return; }
    const form = new FormData(); form.set('photo', file);
    setSaving(true); setMessage('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/mon-espace/fiche/photo', { method: 'POST', body: form });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Envoi impossible.');
      setPhoto(data.photo);
      setMessage('Photo enregistrée.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Envoi impossible.'); }
    finally { setSaving(false); event.target.value = ''; }
  }
  return <div className="mx-auto max-w-3xl space-y-4 p-2 sm:p-4 print:max-w-none print:p-0">
    <div className="flex flex-wrap justify-end gap-2 print:hidden">
      <button type="button" onClick={() => setEditing((open) => !open)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold"><UserRoundPen className="h-4 w-4" />{editing ? 'Fermer le formulaire' : 'Compléter ma fiche'}</button>
      <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Printer className="h-4 w-4" /> Imprimer / PDF</button>
    </div>
    {editing && <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 print:hidden">
      {([['birthDate','Date de naissance'],['startDate','Date d’arrivée'],['phone','Téléphone'],['email','Adresse e-mail professionnelle'],['address','Adresse'],['emergencyContact','Contact d’urgence'],['specialty','Spécialité']] as const).map(([key,label]) => <label key={key} className="text-sm font-medium">{label}<input type={key === 'birthDate' || key === 'startDate' ? 'date' : key === 'email' ? 'email' : 'text'} value={details[key]} onChange={(e) => setDetails({ ...details, [key]: e.target.value })} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>)}
      <label className="text-sm font-medium">Pays<select value={details.country} onChange={(e) => setDetails({ ...details, country:e.target.value, province:e.target.value===COUNTRIES[0]?'Kinshasa':'', city:e.target.value===COUNTRIES[0]?'Kinshasa':'' })} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2">{COUNTRIES.map(country=><option key={country}>{country}</option>)}</select></label>
      {details.country===COUNTRIES[0] ? <><label className="text-sm font-medium">Province<select value={details.province} onChange={(e)=>{const p=e.target.value;setDetails({...details,province:p,city:RDC_PROVINCES[p]?.[0]??''});}} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2">{Object.keys(RDC_PROVINCES).map(p=><option key={p}>{p}</option>)}</select></label><label className="text-sm font-medium">Ville<select value={details.city} onChange={e=>setDetails({...details,city:e.target.value})} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2">{(RDC_PROVINCES[details.province]??[]).map(city=><option key={city}>{city}</option>)}</select></label></> : <><label className="text-sm font-medium">Province / région<input value={details.province} onChange={e=>setDetails({...details,province:e.target.value})} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label><label className="text-sm font-medium">Ville<input value={details.city} onChange={e=>setDetails({...details,city:e.target.value})} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label></>}
      <label className="text-sm font-medium">Langues parlées (sélection multiple)<select multiple value={details.languages.split(', ').filter(Boolean)} onChange={e=>setDetails({...details,languages:Array.from(e.target.selectedOptions).map(o=>o.value).join(', ')})} className="mt-1 block min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2">{LANGUAGES.map(language=><option key={language} value={language}>{language}</option>)}</select></label>
      <label className="text-sm font-medium">Photo (JPG, PNG ou WebP, 2 Mo max)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} className="mt-1 block w-full rounded-lg border border-border bg-background p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary-foreground" /></label>
      <label className="text-sm font-medium">Signature (nom à afficher)<input maxLength={120} value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Saisir votre signature" className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
      {message && <p role="status" className="text-xs text-primary sm:col-span-2">{message}</p>}
      <button type="button" disabled={saving} onClick={() => void saveDetails()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-2">{saving ? 'Enregistrement…' : 'Enregistrer mes informations'}</button>
      <p className="text-xs text-muted-foreground sm:col-span-2">Les informations personnelles et la photo sont enregistrées dans le dossier RH. Les données administratives restent modifiables par l’administration uniquement.</p>
    </section>}
    <article className="mx-auto max-w-3xl rounded-2xl border border-border bg-white p-5 text-[#191923] shadow-sm sm:p-8 print:break-inside-avoid print:rounded-none print:border-0 print:shadow-none">
      <header className="flex items-center justify-between gap-3 border-b-4 border-[#191923] pb-4 sm:gap-6 sm:pb-5">
        <div className="min-w-0"><img src="/logo.png" alt="Wab-infos" className="mb-2 h-9 w-auto object-contain object-left" /><h1 className="text-lg font-bold leading-tight sm:text-2xl">Fiche d’identification</h1><p className="mt-1 text-[10px] text-zinc-500 sm:text-xs">Document interne · ressources humaines</p></div>
        <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-300 bg-zinc-100 sm:h-24 sm:w-20">{photo ? <img src={photo} alt="Photo du collaborateur" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl font-bold text-zinc-400">{person.firstName[0]}{person.lastName[0]}</div>}</div>
      </header>
      <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 sm:gap-y-4">
        {([['Nom complet',`${person.firstName} ${person.lastName}`],['Fonction',person.jobTitle],['Équipe',person.team],['Statut',person.contractStatus],['Date d’arrivée',profile.startDate ?? person.startDate],['Matricule',profile.employeeNumber],['Date de naissance',profile.birthDate],['Téléphone',details.phone],['E-mail professionnel',details.email],['Adresse',details.address],['Pays',details.country],['Province',details.province],['Ville',details.city],['Contact d’urgence',details.emergencyContact],['Lieu d’affectation',profile.workLocation],['Type de contrat',profile.contractType],['Fin de contrat',profile.contractEndDate],['Spécialité',details.specialty],['Langues parlées',details.languages]] as const).map(([label,value]) => <div key={label}><dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</dt><dd className="mt-1 min-h-5 font-medium">{value || '—'}</dd></div>)}
      </dl>
      <div className="mt-8 flex flex-col items-center justify-between gap-6 border-t border-zinc-200 pt-5 text-center text-[10px] text-zinc-500 sm:flex-row">
        <p className="uppercase tracking-wider">Signature du collaborateur</p>
        <div className="relative flex h-28 w-28 items-center justify-center">
          {seal ? <img src={seal} alt="Sceau officiel RH" className="absolute inset-0 h-full w-full object-contain" /> : <span className="rounded-full border-2 border-dashed border-zinc-300 px-2 py-8 text-[9px]">Sceau à téléverser</span>}
          {signature && <span className="relative z-10 -rotate-12 break-words px-2 font-serif text-sm italic text-blue-900">{signature}</span>}
        </div>
        <p className="uppercase tracking-wider">Validation RH</p>
      </div>
      <p className="mt-6 border-t border-zinc-200 pt-3 text-[10px] leading-4 text-zinc-400">Fiche d’identification personnelle. Les dates et coordonnées communiquées sont enregistrées dans votre dossier ; les champs administratifs restent sous la responsabilité de l’administration RH.</p>
    </article>
  </div>;
}
