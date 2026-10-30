import Link from 'next/link';
import {
  ArrowDownUp,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  FileLock2,
  FileSpreadsheet,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { formatMinorUnits, type RhCurrency } from '@/lib/redaction/rh/money';
import type { RhCapabilities } from '@/lib/redaction/rh/permissions';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  paid: 'Payée',
  rejected: 'Refusée',
  cancelled: 'Annulée',
};

function shortRef(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'primary',
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: typeof UsersRound;
  tone?: 'primary' | 'amber' | 'emerald' | 'rose';
}) {
  const tones: Record<string, string> = {
    primary: 'bg-primary/[0.07] text-primary',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{hint}</p>
    </div>
  );
}

export function RhDashboard({
  collaborators,
  absencesPending,
  submissionsPending,
  withdrawalsPending,
  disputesOpen,
  balances,
  pendingWithdrawals,
  capabilities,
}: {
  collaborators: number;
  absencesPending: number;
  submissionsPending: number;
  withdrawalsPending: number;
  disputesOpen: number;
  balances: Array<{ currency: RhCurrency; available: string | null }>;
  pendingWithdrawals: Array<{
    id: string;
    collaborator: string;
    amountMinor: string;
    currency: RhCurrency;
    status: string;
  }>;
  capabilities: RhCapabilities;
}) {
  const quickLinks = [
    capabilities.hrManage
      ? { href: '/rh/equipe', label: 'Collaborateurs', text: 'Dossiers et comptes liés', icon: UsersRound }
      : null,
    capabilities.hrManage
      ? { href: '/rh/prestations', label: 'Prestations', text: 'Journées à vérifier', icon: ClipboardList }
      : null,
    capabilities.hrManage
      ? { href: '/rh/conges', label: 'Congés', text: 'Demandes à traiter', icon: CalendarDays }
      : null,
    capabilities.financeManage
      ? { href: '/rh/retraits', label: 'Retraits', text: 'Soldes et paiements', icon: ArrowDownUp }
      : null,
    capabilities.financeManage
      ? { href: '/rh/remunerations', label: 'Rémunérations', text: 'Montants mensuels', icon: WalletCards }
      : null,
    capabilities.accessManage
      ? { href: '/rh/documents', label: 'Documents', text: 'Contrats et attestations', icon: FileLock2 }
      : null,
    capabilities.hrManage
      ? { href: '/rh/rapports', label: 'Rapports', text: 'Exports journalisés', icon: FileSpreadsheet }
      : null,
    capabilities.accessManage
      ? { href: '/rh/acces', label: 'Accès & sécurité', text: 'Rôles et liaisons', icon: ShieldCheck }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Collaborateurs actifs" value={collaborators} hint="Dossiers RH en cours" icon={UsersRound} />
        <Kpi label="Absences en attente" value={absencesPending} hint="Demandes à valider ou refuser" icon={CalendarDays} tone="amber" />
        <Kpi label="Retraits à traiter" value={withdrawalsPending} hint="Demandes en attente ou approuvées" icon={ArrowDownUp} tone="rose" />
        <Kpi label="Contestations ouvertes" value={disputesOpen} hint="Réponses attendues" icon={MessageSquare} tone="amber" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Soldes disponibles</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Somme des soldes de l’équipe, par devise.</p>
            </div>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {balances.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun solde initial établi.</p>
            ) : (
              balances.map((balance) => (
                <div key={balance.currency} className="rounded-xl bg-muted/60 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {balance.currency}
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums">
                    {balance.available === null
                      ? 'Non établi'
                      : formatMinorUnits(BigInt(balance.available), balance.currency)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Disponible après réservations</p>
                </div>
              ))
            )}
          </div>
          {capabilities.financeManage ? (
            <Link href="/rh/retraits" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
              Gérer les soldes et les retraits <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Retraits à traiter</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Demandes en attente ou approuvées, à payer.</p>
            </div>
            <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-400">
              {withdrawalsPending}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {pendingWithdrawals.length === 0 ? (
              <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">Aucune demande en attente.</p>
            ) : (
              pendingWithdrawals.slice(0, 5).map((withdrawal) => (
                <div key={withdrawal.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{withdrawal.collaborator}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Retrait {shortRef(withdrawal.id)} · {STATUS_LABELS[withdrawal.status] ?? withdrawal.status}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums">
                    {formatMinorUnits(BigInt(withdrawal.amountMinor), withdrawal.currency)}
                  </p>
                </div>
              ))
            )}
          </div>
          <Link href="/rh/retraits" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
            Ouvrir les retraits <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>

      <section>
        <h2 className="text-sm font-bold">Accès rapides</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map(({ href, label, text, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.07] text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>
              <p className="mt-3 text-sm font-bold">{label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{text}</p>
            </Link>
          ))}
        </div>
      </section>

      <p className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-xs leading-5 text-amber-900 dark:text-amber-200">
        Module en cours de validation : les règles RH en RDC et les traitements financiers doivent être vérifiés avant toute
        utilisation réelle. Aucun transfert d’argent n’est effectué automatiquement.
      </p>
    </div>
  );
}
