'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { MyRhTopbarActions } from './my-rh-topbar';
import {
  ChevronRight,
  Eye,
  EyeOff,
  IdCard,
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
  presencesCount,
  prestationsCount,
  documentsCount,
  performances,
  youtubeEnabled,
  flags,
}: {
  person: { firstName: string; lastName: string; jobTitle: string | null; team: string | null; hasPhoto: boolean };
  balances: Balance[];
  withdrawals: Withdrawal[];
  presencesCount: number;
  prestationsCount: number;
  documentsCount: number;
  performances: YoutubePerformance[];
  youtubeEnabled: boolean;
  flags: {
    financeEnabled: boolean;
    withdrawalsEnabled: boolean;
    documentsEnabled: boolean;
    disputesEnabled: boolean;
    notificationsEnabled: boolean;
    serviceCardsEnabled: boolean;
  };
}) {
  const [showBalances, setShowBalances] = useState(true);
  const quickLinks = [
    { href: '/mon-rh/presence', label: 'Présences', icon: CalendarDays, show: true },
    { href: '/mon-rh/prestations', label: 'Prestations', icon: ClipboardList, show: true },
    { href: '/mon-rh/paiements-anciens', label: 'Anciens paiements', icon: WalletCards, show: true },
    { href: '/mon-rh/retraits', label: 'Retraits', icon: ArrowDownUp, show: flags.financeEnabled && flags.withdrawalsEnabled },
    { href: '/mon-rh/remunerations', label: 'Rémunérations', icon: Banknote, show: flags.financeEnabled },
    { href: '/mon-rh/documents', label: 'Documents', icon: FileLock2, show: flags.documentsEnabled },
    { href: '/mon-rh/carte-service', label: 'Carte de service', icon: IdCard, show: flags.serviceCardsEnabled },
    { href: '/mon-rh/contestations', label: 'Contestations', icon: MessageSquare, show: flags.disputesEnabled },
    { href: '/mon-rh/notifications', label: 'Notifications', icon: Bell, show: flags.notificationsEnabled },
  ].filter((item) => item.show);

  return (
    <div className="space-y-5 rounded-3xl bg-muted/40 p-2 sm:p-4">
      <div className="relative overflow-hidden rounded-b-[2rem] rounded-t-2xl bg-gradient-to-br from-[#c41e3a] via-[#9e172e] to-[#1d3557] px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-20 text-white shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">WAB Infos · Mon RH</p>
            <p className="mt-1 text-sm font-semibold text-white/90">Tableau de bord personnel</p>
          </div>
          <div className="flex items-center gap-1.5 lg:hidden">
            <ThemeToggle tone="inverse" className="h-10 w-10 rounded-full" />
            <MyRhTopbarActions tone="inverse" />
          </div>
        </div>
      </div>

      <section className="relative z-10 -mt-14 mx-1 rounded-2xl border border-border/80 bg-card p-4 shadow-md sm:mx-2 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-lg font-bold text-primary ring-2 ring-primary/15">
            {person.firstName.charAt(0).toUpperCase()}{person.lastName.charAt(0).toUpperCase()}
            {person.hasPhoto ? <img src="/api/redaction/rh/mon-espace/fiche/photo" alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} className="absolute inset-0 h-full w-full object-cover" /> : null}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold">{person.firstName} {person.lastName}</p>
            <p className="truncate text-xs font-semibold text-muted-foreground">{[person.jobTitle, person.team].filter(Boolean).join(' · ') || 'Collaborateur'}</p>
            <Link href="/mon-rh/fiche?edit=1" className="mt-1 inline-block text-xs font-bold text-primary hover:underline">Gérer mon profil</Link>
          </div>
        </div>

        <div className="mt-4 flex items-center border-y border-border/70">
          <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-border/70 text-center">
            <Link href="/mon-rh/presence" className="px-1 py-3"><p className="font-display text-xl font-bold tabular-nums text-primary">{presencesCount}</p><p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">Présences</p></Link>
            <Link href="/mon-rh/prestations" className="px-1 py-3"><p className="font-display text-xl font-bold tabular-nums text-primary">{prestationsCount}</p><p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">Prestations</p></Link>
            <Link href="/mon-rh/documents" className="px-1 py-3"><p className="font-display text-xl font-bold tabular-nums text-primary">{documentsCount}</p><p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">Documents</p></Link>
          </div>
          <Link href="/mon-rh/plus" aria-label="Voir toutes les statistiques" className="px-2 py-3 text-muted-foreground"><ChevronRight className="h-5 w-5" /></Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
          <Link href="/mon-rh/presence" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/30 transition hover:bg-primary/90 sm:text-sm">
            <CalendarDays className="h-4 w-4" /> Pointer / Présence
          </Link>
          <Link href="/mon-rh/prestations" className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary bg-primary/10 px-3 py-2.5 text-xs font-bold text-primary transition hover:bg-primary/15 sm:text-sm">
            <ClipboardList className="h-4 w-4" /> Mes prestations
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
            <button type="button" onClick={() => setShowBalances((value) => !value)} aria-pressed={!showBalances} aria-label={showBalances ? 'Masquer les soldes' : 'Afficher les soldes'} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground">
              {showBalances ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}<span className="hidden sm:inline">{showBalances ? 'Masquer' : 'Afficher'}</span>
            </button>
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
                    <p className="mt-0.5 text-lg font-bold tabular-nums sm:text-xl">{balance.available === null ? 'Non établi' : showBalances ? available : '••••••'}</p>
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

    </div>
  );
}
