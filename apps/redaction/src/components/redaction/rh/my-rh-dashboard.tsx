import Link from 'next/link';
import {
  ArrowDownUp,
  ArrowRight,
  Bell,
  CalendarDays,
  ClipboardList,
  FileLock2,
  MessageSquare,
  WalletCards,
} from 'lucide-react';
import { formatMinorUnits, type RhCurrency } from '@/lib/redaction/rh/money';
import type { YoutubePerformance } from '@/lib/redaction/rh/youtube-performance';
import type { Balance, Withdrawal } from '@/lib/redaction/rh/withdrawals';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  paid: 'Payée',
  rejected: 'Refusée',
  cancelled: 'Annulée',
};
const STATUS_TONES: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  approved: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  paid: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  rejected: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  cancelled: 'bg-muted text-muted-foreground',
};

function shortRef(withdrawal: Withdrawal): string {
  const ref = withdrawal.paymentReference?.trim();
  if (ref) return ref;
  return `#${withdrawal.id.slice(0, 8).toUpperCase()}`;
}

export function MyRhDashboard({
  person,
  balances,
  withdrawals,
  absencesPending,
  notificationsUnread,
  disputesOpen,
  documentsCount,
  performances,
  youtubeEnabled,
  flags,
}: {
  person: { firstName: string; lastName: string };
  balances: Balance[];
  withdrawals: Withdrawal[];
  absencesPending: number;
  notificationsUnread: number;
  disputesOpen: number;
  documentsCount: number;
  performances: YoutubePerformance[];
  youtubeEnabled: boolean;
  flags: {
    financeEnabled: boolean;
    withdrawalsEnabled: boolean;
    documentsEnabled: boolean;
    disputesEnabled: boolean;
    notificationsEnabled: boolean;
  };
}) {
  const quickLinks = [
    { href: '/mon-rh/conges', label: 'Congés', text: 'Demander une absence', icon: CalendarDays, show: true },
    { href: '/mon-rh/prestations', label: 'Prestations', text: 'Déclarer une journée', icon: ClipboardList, show: true },
    { href: '/mon-rh/paiements-anciens', label: 'Anciens paiements', text: 'Déclarer vos paiements passés', icon: WalletCards, show: true },
    { href: '/mon-rh/retraits', label: 'Retraits', text: 'Demander un paiement', icon: ArrowDownUp, show: flags.financeEnabled && flags.withdrawalsEnabled },
    { href: '/mon-rh/remunerations', label: 'Rémunérations', text: 'Montants validés', icon: WalletCards, show: flags.financeEnabled },
    { href: '/mon-rh/documents', label: 'Documents', text: 'Contrats et attestations', icon: FileLock2, show: flags.documentsEnabled },
    { href: '/mon-rh/contestations', label: 'Contestations', text: 'Signaler un désaccord', icon: MessageSquare, show: flags.disputesEnabled },
    { href: '/mon-rh/notifications', label: 'Notifications', text: 'Événements RH', icon: Bell, show: flags.notificationsEnabled },
  ].filter((item) => item.show);

  return (
    <div className="space-y-5">
      {flags.notificationsEnabled && notificationsUnread > 0 ? (
        <Link
          href="/mon-rh/notifications"
          className="flex items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/[0.05] p-4 transition-colors hover:border-primary/50"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold">{notificationsUnread} notification(s) non lue(s)</p>
              <p className="text-xs text-muted-foreground">Consultez les événements RH qui vous concernent.</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-primary" />
        </Link>
      ) : null}

      <section className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-border bg-card p-2.5 shadow-sm sm:rounded-2xl sm:p-4">
          <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[11px]">Absences</p>
          <p className="mt-1 text-xl font-bold tabular-nums sm:mt-2 sm:text-2xl">{absencesPending}</p>
          <p className="text-[9px] leading-tight text-muted-foreground sm:text-[11px]">en attente</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-2.5 shadow-sm sm:rounded-2xl sm:p-4">
          <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[11px]">Contestations</p>
          <p className="mt-1 text-xl font-bold tabular-nums sm:mt-2 sm:text-2xl">{disputesOpen}</p>
          <p className="text-[9px] leading-tight text-muted-foreground sm:text-[11px]">en cours</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-2.5 shadow-sm sm:rounded-2xl sm:p-4">
          <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[11px]">Documents</p>
          <p className="mt-1 text-xl font-bold tabular-nums sm:mt-2 sm:text-2xl">{documentsCount}</p>
          <p className="text-[9px] leading-tight text-muted-foreground sm:text-[11px]">partagé(s)</p>
        </div>
      </section>

      {youtubeEnabled && <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-bold">Mes performances YouTube</h2></div><Link className="text-xs font-semibold text-primary underline" href="/mon-rh/prestations">Voir mes vidéos et mes prestations</Link></div>
        {performances.length ? <>
          <div className="mt-3 grid grid-cols-3 gap-2">{([['Vues', 'views'], ['J’aime', 'likes'], ['Commentaires', 'comments']] as const).map(([label,key]) => <div key={key} className="rounded-xl bg-muted/60 p-3"><p className="text-[11px] text-muted-foreground">{label} cumulés</p><p className="text-lg font-bold tabular-nums">{performances.every(item => item[key] === null) ? '—' : performances.reduce((sum,item) => sum + BigInt(item[key] ?? '0'), BigInt(0)).toLocaleString('fr-FR')}</p></div>)}</div>
          <div className="mt-3 space-y-2">{performances.slice(0, 4).map(item => <div key={item.id} className="rounded-xl border border-border p-3 text-xs"><a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">{item.title} ↗</a><p className="mt-1 text-muted-foreground">{item.role} · {item.submissionDate} · relevé {item.checkedAt ? new Date(item.checkedAt).toLocaleDateString('fr-FR') : 'indisponible'}{item.unavailableAt ? ' · vidéo indisponible, chiffres exclus du cumul' : ''}</p><p className="mt-1">Prime évaluée : {formatMinorUnits(BigInt(item.bonusMinor), item.bonusCurrency)} · à intégrer au circuit de rémunération par l’administration</p></div>)}</div>
        </> : <p className="mt-3 text-sm text-muted-foreground">Aucune vidéo validée pour le moment.</p>}
      </section>}

      {flags.financeEnabled ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Mes soldes</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Bonjour {person.firstName} — montants validés, réservés et payés.
              </p>
            </div>
            {flags.withdrawalsEnabled ? (
              <Link
                href="/mon-rh/retraits"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20"
              >
                <ArrowDownUp className="h-3.5 w-3.5" /> Demander un retrait
              </Link>
            ) : null}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {balances.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Aucun solde disponible pour le moment.
              </p>
            ) : (
              balances.map((balance) => {
                const available =
                  balance.available === null
                    ? 'Non établi'
                    : formatMinorUnits(BigInt(balance.available), balance.currency as RhCurrency);
                return (
                  <div key={balance.currency} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{balance.currency}</p>
                      <WalletCards className="h-4 w-4 text-primary" />
                    </div>
                    <p className="mt-2 text-2xl font-bold tabular-nums">{available}</p>
                    <p className="text-[11px] text-muted-foreground">disponible</p>
                    {balance.available === null ? (
                      <p className="mt-2 rounded-lg bg-amber-500/10 p-2 text-[11px] leading-4 text-amber-800 dark:text-amber-300">
                        L’administrateur doit établir votre solde initial avant tout retrait.
                      </p>
                    ) : flags.withdrawalsEnabled ? (
                      <Link
                        href="/mon-rh/retraits"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                      >
                        Demander un retrait <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          {flags.withdrawalsEnabled ? (
            <div className="mt-5 border-t border-border pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold">Mes dernières demandes de retrait</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Le numéro permet de suivre la demande auprès de l’administration.
                  </p>
                </div>
                <Link href="/mon-rh/retraits" className="text-xs font-bold text-primary hover:underline">
                  Tout voir
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                {withdrawals.length === 0 ? (
                  <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">Aucune demande de retrait.</p>
                ) : (
                  withdrawals.slice(0, 4).map((withdrawal) => (
                    <div
                      key={withdrawal.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Retrait {shortRef(withdrawal)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {withdrawal.paymentDate ? `Payé le ${withdrawal.paymentDate}` : 'Demande enregistrée'}
                          {withdrawal.decisionNote ? ` · ${withdrawal.decisionNote}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_TONES[withdrawal.status] ?? 'bg-muted'}`}
                        >
                          {STATUS_LABELS[withdrawal.status] ?? withdrawal.status}
                        </span>
                        <span className="text-xs font-bold tabular-nums">
                          {formatMinorUnits(BigInt(withdrawal.amountMinor), withdrawal.currency)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}



      <section>
        <h2 className="text-sm font-bold">Accès rapides</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
          {quickLinks.map(({ href, label, text, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/30 sm:rounded-2xl sm:p-4 sm:hover:-translate-y-0.5 sm:hover:shadow-md"
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
    </div>
  );
}
