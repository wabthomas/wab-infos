'use client';

import { Printer } from 'lucide-react';
import { formatMinorUnits } from '@/lib/redaction/rh/money';
import type { Withdrawal } from '@/lib/redaction/rh/withdrawals';

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  paid: 'Payée',
  rejected: 'Refusée',
  cancelled: 'Annulée',
};
const methodLabels: Record<string, string> = {
  mobile_money: 'Mobile Money',
  virement: 'Virement',
  especes: 'Espèces',
  autre: 'Autre',
};

export function PaymentReceipt({
  person,
  withdrawal,
}: {
  person: { firstName: string; lastName: string; jobTitle: string; team: string };
  withdrawal: Withdrawal;
}) {
  const reference = withdrawal.paymentReference?.trim() || `#${withdrawal.id.slice(0, 8).toUpperCase()}`;
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

      <article className="rounded-2xl border border-border bg-white p-8 text-[#191923] shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <header className="flex flex-col gap-3 border-b-2 border-[#191923] pb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-rose-600">Wab-infos</p>
            <h1 className="mt-1 text-2xl font-bold">Reçu de paiement</h1>
            <p className="mt-1 text-xs text-zinc-500">Ressources humaines · document interne</p>
          </div>
          <div className="text-right text-xs text-zinc-500">
            <p>Réf. {reference}</p>
            <p>Statut : {statusLabels[withdrawal.status] ?? withdrawal.status}</p>
            {withdrawal.paymentDate && <p>Payé le {withdrawal.paymentDate}</p>}
          </div>
        </header>

        <dl className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 sm:gap-5">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Bénéficiaire</dt>
            <dd className="mt-1 font-semibold">
              {person.firstName} {person.lastName}
            </dd>
            <dd className="text-xs text-zinc-500">
              {person.jobTitle} · {person.team}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Moyen de paiement</dt>
            <dd className="mt-1 font-semibold">{methodLabels[withdrawal.method] ?? withdrawal.method}</dd>
            <dd className="text-xs text-zinc-500">{withdrawal.payoutLabel ?? 'Destination non précisée'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Montant</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">
              {formatMinorUnits(BigInt(withdrawal.amountMinor), withdrawal.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Référence de paiement</dt>
            <dd className="mt-1 font-semibold">{withdrawal.paymentReference ?? '—'}</dd>
          </div>
        </dl>

        {withdrawal.decisionNote && (
          <p className="mt-6 rounded-lg bg-zinc-100 p-3 text-xs text-zinc-600">
            Note : {withdrawal.decisionNote}
          </p>
        )}

        <div className="mt-10 flex items-end justify-between gap-6 text-xs text-zinc-500">
          <div>
            <p className="mb-8">Signature du bénéficiaire</p>
            <div className="h-px w-40 bg-zinc-400" />
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-zinc-300 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
              Sceau RH
            </div>
          </div>
          <div>
            <p className="mb-8">Pour Wab-infos</p>
            <div className="h-px w-40 bg-zinc-400" />
          </div>
        </div>

        <p className="mt-8 border-t border-zinc-200 pt-3 text-[10px] leading-4 text-zinc-400">
          Ce reçu atteste du paiement enregistré dans le système. Il ne remplace pas un relevé bancaire ou Mobile Money.
          Aucun transfert automatique n’est effectué par la plateforme.
        </p>
      </article>
    </div>
  );
}
