'use client';

import { useState, type ChangeEvent } from 'react';
import { Printer, UserRoundPen } from 'lucide-react';

type Person = { firstName: string; lastName: string; jobTitle: string; team: string; contractStatus: string; startDate: string | null };
export function EmployeeIdCard({ person }: { person: Person }) {
  const [details, setDetails] = useState({ birthDate: '', phone: '', email: '', address: '', emergencyContact: '', matricule: '', workLocation: '', supervisor: '', contractType: '', contractEndDate: '', specialty: '', languages: '' });
  const [photo, setPhoto] = useState('');
  const [signature, setSignature] = useState('');
  const [editing, setEditing] = useState(false);
  function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 4_000_000) return;
    const reader = new FileReader(); reader.onload = () => setPhoto(String(reader.result)); reader.readAsDataURL(file);
  }
  return <div className="mx-auto max-w-3xl space-y-4 p-2 sm:p-4 print:max-w-none print:p-0">
    <div className="flex flex-wrap justify-end gap-2 print:hidden">
      <button type="button" onClick={() => setEditing((open) => !open)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold"><UserRoundPen className="h-4 w-4" />{editing ? 'Fermer le formulaire' : 'Compléter ma fiche'}</button>
      <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Printer className="h-4 w-4" /> Imprimer / PDF</button>
    </div>
    {editing && <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 print:hidden">
      {([['birthDate','Date de naissance'],['phone','Téléphone'],['email','Adresse e-mail professionnelle'],['address','Adresse'],['emergencyContact','Contact d’urgence'],['matricule','Matricule'],['workLocation','Lieu d’affectation'],['supervisor','Responsable hiérarchique'],['contractType','Type de contrat'],['contractEndDate','Fin de contrat (facultatif)'],['specialty','Spécialité'],['languages','Langues parlées']] as const).map(([key,label]) => <label key={key} className="text-sm font-medium">{label}<input type={key === 'birthDate' || key === 'contractEndDate' ? 'date' : key === 'email' ? 'email' : 'text'} value={details[key]} onChange={(e) => setDetails({ ...details, [key]: e.target.value })} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>)}
      <label className="text-sm font-medium">Photo (JPG/PNG, 4 Mo max)<input type="file" accept="image/*" onChange={uploadPhoto} className="mt-1 block w-full text-xs" /></label>
      <label className="text-sm font-medium">Signature (nom manuscrit)<input maxLength={80} value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Saisir votre signature" className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
      <p className="text-xs text-muted-foreground sm:col-span-2">Ces informations sont ajoutées à cette fiche pour impression et ne sont pas enregistrées sur le serveur. Pour les conserver, contactez l’administration RH.</p>
    </section>}
    <article className="mx-auto max-w-3xl rounded-2xl border border-border bg-white p-5 text-[#191923] shadow-sm sm:p-8 print:rounded-none print:border-0 print:shadow-none">
      <header className="flex items-center justify-between gap-3 border-b-4 border-[#191923] pb-4 sm:gap-6 sm:pb-5">
        <div className="min-w-0"><img src="/logo.png" alt="Wab-infos" className="mb-2 h-9 w-auto object-contain object-left" /><h1 className="text-lg font-bold leading-tight sm:text-2xl">Fiche d’identification</h1><p className="mt-1 text-[10px] text-zinc-500 sm:text-xs">Document interne · ressources humaines</p></div>
        <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-300 bg-zinc-100 sm:h-24 sm:w-20">{photo ? <img src={photo} alt="Photo du collaborateur" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl font-bold text-zinc-400">{person.firstName[0]}{person.lastName[0]}</div>}</div>
      </header>
      <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 sm:gap-y-4">
        {([['Nom complet',`${person.firstName} ${person.lastName}`],['Fonction',person.jobTitle],['Équipe',person.team],['Statut',person.contractStatus],['Date d’arrivée',person.startDate ?? '—'],['Matricule',details.matricule],['Date de naissance',details.birthDate],['Téléphone',details.phone],['E-mail',details.email],['Adresse',details.address],['Contact d’urgence',details.emergencyContact],['Lieu d’affectation',details.workLocation],['Responsable hiérarchique',details.supervisor],['Type de contrat',details.contractType],['Fin de contrat',details.contractEndDate],['Spécialité',details.specialty],['Langues parlées',details.languages]] as const).map(([label,value]) => <div key={label}><dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</dt><dd className="mt-1 min-h-5 font-medium">{value || '—'}</dd></div>)}
      </dl>
      <div className="mt-8 flex flex-col items-center justify-between gap-6 border-t border-zinc-200 pt-5 text-center text-[10px] text-zinc-500 sm:flex-row">
        <p className="uppercase tracking-wider">Signature du collaborateur</p>
        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg aria-label="Sceau RH transparent" viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-rose-700"><circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2"/><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="1.5"/><text x="50" y="45" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor">WAB-INFOS</text><text x="50" y="59" textAnchor="middle" fontSize="7" fill="currentColor">RESSOURCES HUMAINES</text></svg>
          {signature && <span className="relative z-10 -rotate-12 break-words px-2 font-serif text-sm italic text-blue-900">{signature}</span>}
        </div>
        <p className="uppercase tracking-wider">Validation RH</p>
      </div>
      <p className="mt-6 border-t border-zinc-200 pt-3 text-[10px] leading-4 text-zinc-400">Fiche d’identification personnelle. Les données complémentaires saisies dans le formulaire ne sont pas sauvegardées ; toute mise à jour officielle doit être validée par l’administration RH.</p>
    </article>
  </div>;
}
