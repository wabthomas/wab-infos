'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import {
  ArrowDownUp,
  ArrowLeft,
  Bell,
  CalendarDays,
  ClipboardList,
  FileLock2,
  FileSpreadsheet,
  LayoutDashboard,
  LayoutGrid,
  LockKeyhole,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import type { RhCapabilities } from '@/lib/redaction/rh/permissions';

type Icon = ComponentType<{ className?: string }>;
type RhFlags = {
  financeEnabled: boolean;
  withdrawalsEnabled: boolean;
  documentsEnabled: boolean;
  disputesEnabled: boolean;
  notificationsEnabled: boolean;
};
type Item = { href: string; label: string; icon: Icon; exact?: boolean };

const ADMIN_TITLES: Record<string, { eyebrow: string; title: string; text: string }> = {
  '/rh': { eyebrow: 'ESPACE DE TRAVAIL', title: 'Ressources humaines', text: 'Pilotez l’équipe, les prestations et les paiements depuis un seul espace.' },
  '/rh/equipe': { eyebrow: 'ÉQUIPE', title: 'Collaborateurs', text: 'Dossiers professionnels, comptes liés et fonctions de chacun.' },
  '/rh/prestations': { eyebrow: 'SUIVI QUOTIDIEN', title: 'Prestations', text: 'Déclarations de la rédaction et journées à vérifier.' },
  '/rh/conges': { eyebrow: 'TEMPS & DISPONIBILITÉ', title: 'Congés et absences', text: 'Demandes de l’équipe, validations et refus motivés.' },
  '/rh/remunerations': { eyebrow: 'SUIVI FINANCIER', title: 'Rémunérations', text: 'Montants mensuels, validation et référence journalière.' },
  '/rh/retraits': { eyebrow: 'SUIVI FINANCIER', title: 'Retraits', text: 'Soldes, demandes et paiements réellement effectués.' },
  '/rh/documents': { eyebrow: 'ESPACE CONFIDENTIEL', title: 'Documents', text: 'Contrats et attestations conservés de façon privée.' },
  '/rh/contestations': { eyebrow: 'ÉCOUTE & RECOURS', title: 'Contestations', text: 'Réponses aux désaccords exprimés par les collaborateurs.' },
  '/rh/rapports': { eyebrow: 'SUIVI RH', title: 'Rapports', text: 'Exports filtrés et journalisés pour le suivi de l’équipe.' },
  '/rh/acces': { eyebrow: 'ADMINISTRATION', title: 'Accès et sécurité', text: 'Rôles RH, liaisons de comptes et protections des données.' },
  '/rh/plus': { eyebrow: 'TOUS LES ESPACES', title: 'Plus', text: 'Accès direct aux autres sections du module RH.' },
};

const MY_TITLES: Record<string, { eyebrow: string; title: string; text: string }> = {
  '/mon-rh': { eyebrow: 'MON ESPACE', title: 'Mon espace RH', text: 'Vos soldes, demandes, documents et notifications en un coup d’œil.' },
  '/mon-rh/conges': { eyebrow: 'TEMPS & DISPONIBILITÉ', title: 'Mes congés', text: 'Vos demandes d’absence et leur suivi.' },
  '/mon-rh/prestations': { eyebrow: 'SUIVI QUOTIDIEN', title: 'Mes prestations', text: 'Déclarez et suivez vos journées de travail.' },
  '/mon-rh/presence': { eyebrow: 'TEMPS DE TRAVAIL', title: 'Ma présence', text: 'Signez votre arrivée et votre sortie.' },
  '/mon-rh/remunerations': { eyebrow: 'SUIVI FINANCIER', title: 'Mes rémunérations', text: 'Montants validés par l’administration.' },
  '/mon-rh/retraits': { eyebrow: 'SUIVI FINANCIER', title: 'Mes retraits', text: 'Solde disponible, demandes et paiements enregistrés.' },
  '/mon-rh/documents': { eyebrow: 'ESPACE CONFIDENTIEL', title: 'Mes documents', text: 'Contrats, attestations et documents partagés.' },
  '/mon-rh/contestations': { eyebrow: 'ÉCOUTE & RECOURS', title: 'Mes contestations', text: 'Signalez un désaccord et suivez la réponse.' },
  '/mon-rh/notifications': { eyebrow: 'SUIVI', title: 'Mes notifications', text: 'Les événements RH qui vous concernent.' },
  '/mon-rh/plus': { eyebrow: 'TOUS LES ESPACES', title: 'Plus', text: 'Accès direct aux autres sections de mon espace.' },
};

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function RhSectionShell({
  mode,
  capabilities,
  flags,
  children,
}: {
  mode: 'admin' | 'employee';
  capabilities?: RhCapabilities;
  flags: RhFlags;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const adminItems: Item[] = [
    { href: '/rh', label: 'Vue d’ensemble', icon: LayoutDashboard, exact: true },
    ...(capabilities?.hrManage
      ? ([
          { href: '/rh/equipe', label: 'Collaborateurs', icon: UsersRound },
          { href: '/rh/prestations', label: 'Prestations', icon: ClipboardList },
          { href: '/rh/conges', label: 'Congés', icon: CalendarDays },
        ] satisfies Item[])
      : []),
    ...(capabilities?.financeManage
      ? ([
          { href: '/rh/remunerations', label: 'Rémunérations', icon: WalletCards },
          { href: '/rh/retraits', label: 'Retraits', icon: ArrowDownUp },
        ] satisfies Item[])
      : []),
    ...(capabilities?.accessManage
      ? ([
          { href: '/rh/documents', label: 'Documents', icon: FileLock2 },
          { href: '/rh/contestations', label: 'Contestations', icon: MessageSquare },
          { href: '/rh/acces', label: 'Accès', icon: ShieldCheck },
        ] satisfies Item[])
      : []),
    ...(capabilities?.hrManage
      ? ([{ href: '/rh/rapports', label: 'Rapports', icon: FileSpreadsheet }] satisfies Item[])
      : []),
    { href: '/rh/plus', label: 'Plus', icon: LayoutGrid },
  ];

  const myItems: Item[] = [
    { href: '/mon-rh', label: 'Vue d’ensemble', icon: LayoutDashboard, exact: true },
    { href: '/mon-rh/conges', label: 'Congés', icon: CalendarDays },
    { href: '/mon-rh/prestations', label: 'Prestations', icon: ClipboardList },
    { href: '/mon-rh/presence', label: 'Présence', icon: UserCheck },
    ...(flags.financeEnabled
      ? ([
          { href: '/mon-rh/remunerations', label: 'Rémunérations', icon: WalletCards },
          ...(flags.withdrawalsEnabled
            ? ([{ href: '/mon-rh/retraits', label: 'Retraits', icon: ArrowDownUp }] satisfies Item[])
            : []),
        ] satisfies Item[])
      : []),
    ...(flags.documentsEnabled
      ? ([{ href: '/mon-rh/documents', label: 'Documents', icon: FileLock2 }] satisfies Item[])
      : []),
    ...(flags.disputesEnabled
      ? ([{ href: '/mon-rh/contestations', label: 'Contestations', icon: MessageSquare }] satisfies Item[])
      : []),
    ...(flags.notificationsEnabled
      ? ([{ href: '/mon-rh/notifications', label: 'Notifications', icon: Bell }] satisfies Item[])
      : []),
    { href: '/mon-rh/plus', label: 'Plus', icon: LayoutGrid },
  ];

  const items = mode === 'admin' ? adminItems : myItems;
  const titles = mode === 'admin' ? ADMIN_TITLES : MY_TITLES;
  const info = titles[pathname] ?? (mode === 'admin' ? ADMIN_TITLES['/rh'] : MY_TITLES['/mon-rh']);

  return (
    <div className="space-y-5 pb-14">
      <header className="relative overflow-hidden rounded-[1.75rem] bg-[#191923] px-5 py-6 text-white shadow-sm sm:px-8 sm:py-7">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full border border-white/[0.06] bg-white/[0.03]" />
        <div aria-hidden className="pointer-events-none absolute -right-20 top-10 h-44 w-44 rounded-full border border-white/[0.05]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <Link
              href={mode === 'admin' ? '/' : '/profil'}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {mode === 'admin' ? 'Retour à la rédaction' : 'Retour au profil'}
            </Link>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-rose-300">{info.eyebrow}</p>
            <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {info.title}
              <span className="text-rose-400">.</span>
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-zinc-300">{info.text}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-2 text-[11px] font-medium text-zinc-200">
            <LockKeyhole className="h-3.5 w-3.5 text-rose-300" />
            {mode === 'admin' ? 'Espace de gestion RH' : 'Espace personnel protégé'}
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <nav
          aria-label={mode === 'admin' ? 'Sections RH' : 'Sections de mon espace RH'}
          className="lg:sticky lg:top-4 lg:w-56 lg:shrink-0"
        >
          <p className="mb-3 hidden px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground lg:block">
            {mode === 'admin' ? 'Navigation RH' : 'Mon espace'}
          </p>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
            {items.map(({ href, label, icon: NavIcon, exact }) => {
              const active = isActive(pathname, href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition-colors lg:w-full ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                      : 'border border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <NavIcon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0 flex-1 space-y-5">{children}</div>
      </div>
    </div>
  );
}
