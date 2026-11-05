import Link from 'next/link';
import {
  ArrowDownUp,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  FileLock2,
  FileSpreadsheet,
  MessageSquare,
  Settings,
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
  icon: Icon,
  tone = 'primary',
}: {
  label: string;
  value: string | number;
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
    <div className="rounded-xl border border-border bg-card p-2.5 shadow-sm sm:rounded-2xl sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[11px]">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums tracking-tight sm:mt-2 sm:text-2xl">{value}</p>
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
  youtubeEnabled,
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
  youtubeEnabled: boolean;
}) {
  const quickLinks = [
    capabilities.hrManage
      ? { href: '/rh/equipe', label: 'Collaborateurs', icon: UsersRound }
      : null,
    capabilities.hrManage
      ? { href: '/rh/prestations', label: 'Prestations', icon: ClipboardList }
      : null,
    capabilities.hrManage && youtubeEnabled
      ? { href: '/rh/prestations#performances-youtube', label: 'Performances YouTube', icon: TrendingUp }
      : null,
    capabilities.hrManage
      ? { href: '/rh/conges', label: 'Congés', icon: CalendarDays }
      : null,
    capabilities.financeManage
      ? { href: '/rh/retraits', label: 'Retraits', icon: ArrowDownUp }
      : null,
    capabilities.financeManage
      ? { href: '/rh/remunerations', label: 'Rémunérations', icon: WalletCards }
      : null,
    capabilities.accessManage
      ? { href: '/rh/documents', label: 'Documents', icon: FileLock2 }
      : null,
    capabilities.hrManage
      ? { href: '/rh/rapports', label: 'Rapports', icon: FileSpreadsheet }
      : null,
    capabilities.accessManage
      ? { href: '/rh/parametres', label: 'Paramètres', icon: Settings }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <Kpi label="Collaborateurs actifs" value={collaborators} icon={UsersRound} />
        <Kpi label="Absences en attente" value={absencesPending} icon={CalendarDays} tone="amber" />
        <Kpi label="Retraits à traiter" value={withdrawalsPending} icon={ArrowDownUp} tone="rose" />
        <Kpi label="Contestations ouvertes" value={disputesOpen} icon={MessageSquare} tone="amber" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-3 sm:rounded-2xl sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Soldes disponibles</h2>
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

        <section className="rounded-xl border border-border bg-card p-3 sm:rounded-2xl sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Retraits à traiter</h2>
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
        <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
          {quickLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/30 sm:rounded-2xl sm:p-4 sm:transition-all sm:hover:-translate-y-0.5 sm:hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.07] text-primary sm:h-10 sm:w-10 sm:rounded-xl">
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>
              <p className="mt-2 text-xs font-bold sm:mt-3 sm:text-sm">{label}</p>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
