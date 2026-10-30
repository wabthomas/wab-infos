'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Printer, ReceiptText, ShieldCheck } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { DEFAULT_ORGANIZATION_SETTINGS, type OrganizationSettings } from '@/lib/redaction/rh/organization';
import { formatMinorUnits } from '@/lib/redaction/rh/money';
import type { Withdrawal } from '@/lib/redaction/rh/withdrawals';

const statusLabels: Record<string, string> = {
  pending: 'En attente', approved: 'Approuvée', paid: 'Payée', rejected: 'Refusée', cancelled: 'Annulée',
};
const methodLabels: Record<string, string> = {
  mobile_money: 'Mobile Money', virement: 'Virement bancaire', especes: 'Espèces', autre: 'Autre',
};
const assetUrl = (key: string) => `/api/redaction/rh/organisation/assets/${key}`;

export function PaymentReceipt({
  person,
  withdrawal,
}: {
  person: { firstName: string; lastName: string; jobTitle: string; team: string };
  withdrawal: Withdrawal;
}) {
  const [company, setCompany] = useState<OrganizationSettings>(DEFAULT_ORGANIZATION_SETTINGS);
  const [assets, setAssets] = useState<Record<string, string | null>>({});
  const reference = withdrawal.paymentReference?.trim() || `RH-${withdrawal.id.slice(0, 8).toUpperCase()}`;
  const paid = withdrawal.status === 'paid';

  useEffect(() => {
    let active = true;
    fetchRedaction('/api/redaction/rh/organisation', { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (active && data?.settings) setCompany({ ...DEFAULT_ORGANIZATION_SETTINGS, ...data.settings }); })
      .catch(() => undefined);
    for (const key of ['company-logo','director-signature','company-seal','rh-seal','document-header','document-footer']) {
      fetchRedaction(assetUrl(key), { cache: 'no-store' })
        .then(async (response) => response.ok ? response.json() : null)
        .then((data) => { if (active && data) setAssets((current) => ({ ...current, [key]: data.asset ?? null })); })
        .catch(() => undefined);
    }
    return () => { active = false; };
  }, []);

  return <div className="mx-auto max-w-3xl space-y-4 p-3 sm:p-5 print:max-w-none print:p-0">
    <div className="flex justify-end print:hidden">
      <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-105"><Printer className="h-4 w-4" /> Imprimer / PDF</button>
    </div>

    <article className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white text-[#171923] shadow-xl shadow-slate-900/5 print:break-inside-avoid print:rounded-none print:border-0 print:shadow-none">
      <div className="relative overflow-hidden bg-[#171923] px-5 py-6 text-white sm:px-8 sm:py-8 print:px-8 print:py-6">
        <div aria-hidden className="absolute -right-12 -top-20 h-56 w-56 rounded-full border border-white/10 bg-white/[0.03]" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="flex min-w-0 items-center gap-3">
            {assets['company-logo'] ? <img src={assets['company-logo']!} alt="Logo" className="h-12 max-w-24 rounded-lg bg-white p-1.5 object-contain" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-300"><ReceiptText className="h-5 w-5" /></span>}
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-300">{paid ? 'Justificatif de paiement' : 'Récapitulatif de retrait'}</p><h1 className="mt-1 truncate text-xl font-bold sm:text-2xl">{paid ? 'Reçu de paiement' : 'Demande de retrait'} · {company.companyName || 'Wab-infos'}</h1><p className="mt-1 text-xs text-white/65">{company.documentHeader || 'Ressources humaines · justificatif de paiement'}</p></div>
          </div>
          <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${paid ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-200' : 'border-amber-300/25 bg-amber-400/10 text-amber-200'}`}>
            {paid ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}{statusLabels[withdrawal.status] ?? withdrawal.status}
          </div>
        </div>
        {assets['document-header'] && <img src={assets['document-header']!} alt="" className="relative mt-5 max-h-14 max-w-full object-contain object-left" />}
        <div className="relative mt-6 grid gap-4 border-t border-white/10 pt-4 text-xs text-white/70 sm:grid-cols-2">
          <div><p className="font-bold uppercase tracking-wider text-white/45">Adresse</p><p className="mt-1">{company.companyAddress || '—'}</p></div>
          <div className="sm:text-right"><p className="font-bold uppercase tracking-wider text-white/45">Contacts officiels</p><p className="mt-1">{[company.companyPhone, company.companyEmail, company.companyWebsite].filter(Boolean).join(' · ') || '—'}</p></div>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-8 print:p-8">
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-slate-50 p-5 sm:flex-row sm:items-center sm:p-6">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{paid ? 'Montant versé' : 'Montant demandé'}</p><p className="mt-1 text-3xl font-black tracking-tight tabular-nums text-[#171923] sm:text-4xl">{formatMinorUnits(BigInt(withdrawal.amountMinor), withdrawal.currency)}</p></div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 sm:min-w-48"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Référence du paiement</p><p className="mt-1 break-all font-mono text-sm font-bold">{reference}</p></div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 p-4 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Bénéficiaire</p><h2 className="mt-2 text-lg font-bold">{person.firstName} {person.lastName}</h2><p className="mt-1 text-sm text-slate-600">{person.jobTitle} · {person.team}</p></section>
          <section className="rounded-2xl border border-slate-200 p-4 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Détails du versement</p><dl className="mt-2 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-500">Mode</dt><dd className="text-right font-semibold">{methodLabels[withdrawal.method] ?? withdrawal.method}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Date de paiement</dt><dd className="text-right font-semibold">{withdrawal.paymentDate || '—'}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Référence bancaire</dt><dd className="break-all text-right font-semibold">{withdrawal.paymentReference || '—'}</dd></div></dl></section>
        </div>

        {withdrawal.decisionNote && <div className="rounded-xl border-l-4 border-rose-400 bg-rose-50 px-4 py-3 text-sm text-slate-700"><p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Note RH</p><p className="mt-1">{withdrawal.decisionNote}</p></div>}

        <div className="grid grid-cols-2 gap-5 border-t border-slate-200 pt-5 sm:grid-cols-3 sm:gap-8">
          <div className="flex min-h-24 flex-col justify-end"><p className="text-xs font-semibold text-slate-600">Signature du bénéficiaire</p><div className="mt-8 border-t border-slate-300 pt-1 text-[10px] text-slate-400">Nom et signature</div></div>
          <div className="flex flex-col items-center justify-end text-center"><div className="relative flex h-24 w-24 items-center justify-center">{assets['company-seal'] || assets['rh-seal'] ? <img src={(assets['company-seal'] || assets['rh-seal'])!} alt="Sceau officiel" className="absolute inset-0 h-full w-full object-contain" /> : <span className="grid h-20 w-20 place-items-center rounded-full border border-dashed border-slate-300 text-slate-400"><ShieldCheck className="h-7 w-7" /></span>}{assets['director-signature'] && <img src={assets['director-signature']!} alt="Signature du Directeur général" className="absolute inset-x-0 bottom-1 z-10 mx-auto h-10 max-w-[90%] object-contain" />}</div><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{company.directorName || 'Direction générale'}</p><p className="text-[9px] text-slate-400">{company.directorTitle}</p></div>
          <div className="col-span-2 flex min-h-24 flex-col justify-end sm:col-span-1"><p className="text-xs font-semibold text-slate-600">Validation des ressources humaines</p><div className="mt-8 border-t border-slate-300 pt-1 text-[10px] text-slate-400">Nom, date et signature</div></div>
        </div>

        <footer className="border-t border-slate-200 pt-4 text-[10px] leading-5 text-slate-500">
          {assets['document-footer'] && <img src={assets['document-footer']!} alt="" className="mb-3 max-h-12 max-w-full object-contain object-left" />}
          <p>{company.documentFooter || (paid ? 'Ce reçu atteste du paiement enregistré dans le système. Il ne remplace pas un relevé bancaire ou Mobile Money. Aucun transfert automatique n’est effectué par la plateforme.' : 'Ce document récapitule une demande de retrait. Il ne constitue pas une preuve de paiement et aucun transfert automatique n’est effectué par la plateforme.')}</p>
          <p className="mt-2">{company.companyTaxId && `ID fiscal : ${company.companyTaxId}. `}{company.companyRegistration && `Enregistrement : ${company.companyRegistration}. `}Réf. {reference}</p>
        </footer>
      </div>
    </article>
  </div>;
}
