import Link from 'next/link';
import {
  ArrowDownUp,
  ArrowRight,
  Banknote,
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
    { href: '/mon-rh/prestations', label: 'Présences', icon: CalendarDays, show: true },
    { href: '/mon-rh/prestations', label: 'Prestations', icon: ClipboardList, show: true },
    { href: '/mon-rh/paiements-anciens', label: 'Anciens paiements', icon: WalletCards, show: true },
    { href: '/mon-rh/retraits', label: 'Retraits', icon: ArrowDownUp, show: flags.financeEnabled && flags.withdrawalsEnabled },
    { href: '/mon-rh/remunerations', label: 'Rémunérations', icon: Banknote, show: flags.financeEnabled },
    { href: '/mon-rh/documents', label: 'Documents', icon: FileLock2, show: flags.documentsEnabled },
    { href: '/mon-rh/contestations', label: 'Contestations', icon: MessageSquare, show: flags.disputesEnabled },
    { href: '/mon-rh/notifications', label: 'Notifications', icon: Bell, show: flags.notificationsEnabled },
  ].filter((item) => item.show);

  return (
    <div className="space-y-5 rounded-3xl bg-muted/40 p-2 sm:p-4">
      <div className="relative overflow-hidden rounded-b-[2rem] rounded-t-2xl bg-gradient-to-br from-[#c41e3a] via-[#9e172e] to-[#1d3557] px-5 pt-6 pb-20 text-white shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">WAB Infos · Mon RH</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
              {person.firstName} {person.lastName}
            </h1>
          </div>
          {flags.notificationsEnabled ? (
            <Link
              href="/mon-rh/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {notificationsUnread > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white shadow">
                  {notificationsUnread}
                </span>
              ) : null}
            </Link>
          ) : null}
        </div>
      </div>

      <section className="relative z-10 -mt-14 mx-1 rounded-2xl border border-border/80 bg-card p-4 shadow-md sm:mx-2 sm:p-5">
        <div className="grid grid-cols-3 gap-2 text-center sm:gap-4">
          <div className="rounded-xl bg-muted/40 p-2.5 sm:p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[11px]">Présences</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground sm:text-2xl">{absencesPending}</p>
            <p className="text-[10px] text-muted-foreground">en attente</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-2.5 sm:p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[11px]">Contestations</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground sm:text-2xl">{disputesOpen}</p>
            <p className="text-[10px] text-muted-foreground">en cours</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-2.5 sm:p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[11px]">Documents</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground sm:text-2xl">{documentsCount}</p>
            <p className="text-[10px] text-muted-foreground">partagé(s)</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
          <Link
            href="/mon-rh/prestations"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/30 transition hover:bg-primary/90 sm:text-sm"
          >
            <CalendarDays className="h-4 w-4" />
            Pointer / Présence
          </Link>
          <Link
            href="/mon-rh/prestations"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary bg-primary/10 px-3 py-2.5 text-xs font-bold text-primary transition hover:bg-primary/15 sm:text-sm"
          >
            <ClipboardList className="h-4 w-4" />
            Mes prestations
          </Link>
        </div>
      </section>

      {flags.financeEnabled ? (
        <div className="relative">
          <div className="pointer-events-none flex justify-between px-12 -mt-5 mb-0">
            <span className="h-5 w-px bg-border" />
            <span className="h-5 w-px bg-border" />
          </div>
          <section className="rounded-2xl border border-border bg-card p-3.5 shadow-sm sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-primary">
              <WalletCards className="h-4 w-4" /> Mes soldes
            </h2>
            {flags.withdrawalsEnabled ? (
              <Link
                href="/mon-rh/retraits"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20"
              >
                <ArrowDownUp className="h-3.5 w-3.5" /> Demander un retrait
              </Link>
            ) : null}
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            {balances.length === 0 ? (
              <p className="col-span-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                Aucun solde disponible pour le moment.
              </p>
            ) : (
              balances.map((balance) => {
                const available =
                  balance.available === null
                    ? 'Non établi'
                    : formatMinorUnits(BigInt(balance.available), balance.currency as RhCurrency);
                return (
                  <div key={balance.currency} className="rounded-xl border border-border bg-muted/20 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{balance.currency}</p>
                    <p className="mt-0.5 text-lg font-bold tabular-nums sm:text-xl">{available}</p>
                  </div>
                );
              })
            )}
          </div>
        </section>
        </div>
      ) : null}

      <section className="px-1">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Actions rapides</h2>
          <Link href="/mon-rh/prestations" className="text-xs font-semibold text-primary hover:underline">
            Tout afficher
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center gap-1.5 rounded-xl p-2 text-center transition hover:bg-card"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-primary shadow-sm">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-medium leading-tight text-foreground">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {youtubeEnabled && <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-bold">Mes performances YouTube</h2></div><Link className="text-xs font-semibold text-primary underline" href="/mon-rh/prestations">Voir mes vidéos et mes prestations</Link></div>
        {performances.length ? <>
          <div className="mt-3 grid grid-cols-3 gap-2">{([['Vues', 'views'], ['J’aime', 'likes'], ['Commentaires', 'comments']] as const).map(([label,key]) => <div key={key} className="rounded-xl bg-muted/60 p-3"><p className="text-[11px] text-muted-foreground">{label} cumulés</p><p className="text-lg font-bold tabular-nums">{performances.every(item => item[key] === null) ? '—' : performances.reduce((sum,item) => sum + BigInt(item[key] ?? '0'), BigInt(0)).toLocaleString('fr-FR')}</p></div>)}</div>
          <div className="mt-3 space-y-2">{performances.slice(0, 4).map(item => <div key={item.id} className="rounded-xl border border-border p-3 text-xs"><a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">{item.title} ↗</a><p className="mt-1 text-muted-foreground">{item.role} · {item.submissionDate} · relevé {item.checkedAt ? new Date(item.checkedAt).toLocaleDateString('fr-FR') : 'indisponible'}{item.unavailableAt ? ' · vidéo indisponible, chiffres exclus du cumul' : ''}</p><p className="mt-1">Prime évaluée : {formatMinorUnits(BigInt(item.bonusMinor), item.bonusCurrency)}</p></div>)}</div>
        </> : <p className="mt-3 text-sm text-muted-foreground">Aucune vidéo validée pour le moment.</p>}
      </section>}

      {flags.financeEnabled ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Mes soldes</h2>
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
          <div className="mt-3 grid grid-cols-2 gap-3">
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
          {quickLinks.map(({ href, label, icon: Icon }) => (
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
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
