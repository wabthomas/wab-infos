'use client';

import { Printer } from 'lucide-react';

export function EmployeeIdCard({
  person,
}: {
  person: { firstName: string; lastName: string; jobTitle: string; team: string; contractStatus: string; startDate: string | null };
}) {
  const initials = `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 print:max-w-none print:p-0">
      <div className="flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Printer className="h-4 w-4" /> Imprimer / PDF
        </button>
      </div>
      <article className="relative overflow-hidden rounded-2xl border border-border bg-white p-8 text-[#191923] shadow-sm print:rounded-none print:border-0">
        <div className="flex items-start justify-between gap-6 border-b-4 border-[#191923] pb-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-rose-600">Wab-infos</p>
            <h1 className="mt-1 text-2xl font-bold">Fiche d’identification du collaborateur</h1>
            <p className="mt-1 text-xs text-zinc-500">Document interne · ressources humaines</p>
          </div>
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-zinc-300 text-2xl font-bold text-zinc-400">
            {initials}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div><dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Nom complet</dt><dd className="mt-1 font-semibold">{person.firstName} {person.lastName}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Fonction</dt><dd className="mt-1 font-semibold">{person.jobTitle}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Équipe</dt><dd className="mt-1">{person.team}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Statut</dt><dd className="mt-1">{person.contractStatus}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Date d’arrivée</dt><dd className="mt-1">{person.startDate ?? '—'}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Matricule</dt><dd className="mt-1">—</dd></div>
        </dl>

        <div className="mt-10 grid grid-cols-3 gap-6 text-center text-[10px] text-zinc-500">
          <div><div className="mx-auto h-24 w-24 rounded-full border-2 border-dashed border-zinc-300" /><p className="mt-2 uppercase tracking-wider">Photo</p></div>
          <div><div className="mx-auto h-24 w-24 rounded-full border-2 border-dashed border-zinc-300" /><p className="mt-2 uppercase tracking-wider">Sceau RH</p></div>
          <div><div className="mx-auto h-24 w-24 rounded-full border-2 border-dashed border-zinc-300" /><p className="mt-2 uppercase tracking-wider">Signature</p></div>
        </div>

        <p className="mt-8 border-t border-zinc-200 pt-3 text-[10px] leading-4 text-zinc-400">
          À compléter par le collaborateur puis à déposer dans ses documents RH. Toute modification doit être validée par
          l’administration.
        </p>
      </article>
    </div>
  );
}
