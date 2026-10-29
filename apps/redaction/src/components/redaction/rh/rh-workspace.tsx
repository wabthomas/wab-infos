'use client';

import { useState, type ComponentType } from 'react';
import { ArrowDownUp, ArrowRight, CalendarDays, CheckCircle2, CircleHelp, ClipboardList, Clock3, FileCheck2, FileLock2, FileSpreadsheet, KeyRound, LayoutGrid, LockKeyhole, ShieldCheck, Sparkles, UsersRound, WalletCards } from 'lucide-react';
import type { RhCapabilities } from '@/lib/redaction/rh/permissions';
import { Adjustments } from './adjustments';
import { Documents } from './documents';
import { Reports } from './reports';
import { RoleManager } from './role-manager';
import { Activities } from './activities';
import { Absences } from './absences';
import { Collaborators } from './collaborators';
import { Remunerations } from './remunerations';
import { SubmissionReview } from './submission-review';
import { WithdrawalReview } from './withdrawal-review';
import { RhCalendar } from '../rh-calendar';

type Section = 'overview' | 'team' | 'activity' | 'leave' | 'pay' | 'withdrawals' | 'access' | 'reports' | 'documents';
type Icon = ComponentType<{ className?: string }>;
const navigation: { id: Section; label: string; icon: Icon }[] = [
  { id: 'overview', label: 'Vue d’ensemble', icon: LayoutGrid },
  { id: 'team', label: 'Collaborateurs', icon: UsersRound },
  { id: 'activity', label: 'Prestations', icon: ClipboardList },
  { id: 'leave', label: 'Congés & absences', icon: CalendarDays },
  { id: 'pay', label: 'Rémunérations', icon: WalletCards },
  { id: 'withdrawals', label: 'Retraits', icon: ArrowDownUp },
  { id: 'documents', label: 'Documents', icon: FileLock2 },
  { id: 'reports', label: 'Rapports', icon: FileSpreadsheet },
  { id: 'access', label: 'Accès & sécurité', icon: ShieldCheck },
];
const sectionInfo: Record<Section, { eyebrow: string; title: string; text: string }> = {
  overview: { eyebrow: 'ESPACE DE TRAVAIL', title: 'Vue d’ensemble', text: 'Tout ce dont vous avez besoin pour accompagner votre équipe, au même endroit.' },
  team: { eyebrow: 'ÉQUIPE', title: 'Collaborateurs', text: 'Gérez les dossiers professionnels et associez les comptes de la rédaction.' },
  activity: { eyebrow: 'SUIVI QUOTIDIEN', title: 'Prestations', text: 'Examinez les déclarations et suivez les journées de prestation.' },
  leave: { eyebrow: 'TEMPS & DISPONIBILITÉ', title: 'Congés et absences', text: 'Consultez et traitez les demandes de votre équipe.' },
  pay: { eyebrow: 'SUIVI FINANCIER', title: 'Rémunérations', text: 'Préparez les montants mensuels et consultez la référence journalière.' },
  withdrawals: { eyebrow: 'SUIVI FINANCIER', title: 'Retraits', text: 'Examinez les demandes et enregistrez les paiements effectués.' },
  documents: { eyebrow: 'ESPACE CONFIDENTIEL', title: 'Documents', text: 'Conservez et partagez les documents RH de manière privée.' },
  reports: { eyebrow: 'SUIVI RH', title: 'Rapports', text: 'Exportez les informations utiles au suivi de l’équipe.' },
  access: { eyebrow: 'ADMINISTRATION', title: 'Accès et sécurité', text: 'Comprendre les accès actuels et les protections prévues pour les données RH.' },
};

function Status({ enabled, enabledText = 'Activé', disabledText = 'Désactivé' }: { enabled: boolean; enabledText?: string; disabledText?: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${enabled ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}><span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-amber-500'}`} />{enabled ? enabledText : disabledText}</span>;
}

function QuickCard({ icon: Icon, label, description, onClick, tag }: { icon: Icon; label: string; description: string; onClick: () => void; tag?: string }) {
  return <button type="button" onClick={onClick} className="group flex min-h-40 flex-col items-start rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
    <div className="flex w-full items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/[0.07] text-primary"><Icon className="h-5 w-5" /></span><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" /></div>
    <span className="mt-4 flex items-center gap-2 text-sm font-bold text-foreground">{label}{tag && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{tag}</span>}</span>
    <span className="mt-1 text-xs leading-5 text-muted-foreground">{description}</span>
  </button>;
}

export function RhWorkspace({ month, today, financeEnabled, withdrawalsEnabled, documentsEnabled, capabilities }: { month: string; today: string; financeEnabled: boolean; withdrawalsEnabled: boolean; documentsEnabled: boolean; capabilities: RhCapabilities }) {
  const [section, setSection] = useState<Section>('overview');
  const info = sectionInfo[section];
  const canSee = (id: Section) => id === 'overview' || (['team', 'activity', 'leave', 'reports'].includes(id) && capabilities.hrManage) || (['pay', 'withdrawals'].includes(id) && capabilities.financeManage) || (['access', 'documents'].includes(id) && capabilities.accessManage);
  return <div className="space-y-6 pb-8">
    <header className="relative overflow-hidden rounded-[1.5rem] bg-[#191923] px-6 py-7 text-white shadow-sm sm:px-8 sm:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-28 h-72 w-72 rounded-full border border-white/[0.06] bg-white/[0.025]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 top-6 h-52 w-52 rounded-full border border-white/[0.06]" />
      <div className="relative flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-xl"><span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-rose-300"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Wab-infos · Rédaction</span>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Ressources humaines<span className="text-rose-400">.</span></h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-300">Un espace pour prendre soin de votre équipe et suivre son activité.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-2 text-xs font-medium text-zinc-200"><LockKeyhole className="h-3.5 w-3.5 text-rose-300" /> Espace de gestion RH</span>
      </div>
    </header>

    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <nav aria-label="Sections des ressources humaines" className="lg:sticky lg:top-4 lg:w-56 lg:shrink-0">
        <p className="mb-3 hidden px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground lg:block">Navigation RH</p>
        <div className="flex gap-1.5 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {navigation.filter((item) => canSee(item.id)).map(({ id, label, icon: NavIcon }) => <button type="button" key={id} aria-current={section === id ? 'page' : undefined} onClick={() => setSection(id)} className={`flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:w-full ${section === id ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/15' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><NavIcon className="h-4 w-4 shrink-0" />{label}</button>)}
        </div>
      </nav>
      <div className="min-w-0 flex-1 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5"><div><p className="text-[10px] font-bold tracking-[0.18em] text-primary">{info.eyebrow}</p><h2 className="mt-1 font-display text-2xl font-bold tracking-tight">{info.title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{info.text}</p></div>{section !== 'overview' && <button type="button" onClick={() => setSection('overview')} className="text-xs font-semibold text-primary hover:underline">Retour à la vue d’ensemble</button>}</div>
        {section === 'overview' && <div className="space-y-6">
          <div><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-bold">Accès rapides</h3><p className="mt-0.5 text-xs text-muted-foreground">Choisissez un espace pour commencer.</p></div><Sparkles className="h-4 w-4 text-primary" /></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {capabilities.hrManage && <QuickCard icon={UsersRound} label="Collaborateurs" description="Dossiers, équipes et comptes liés." onClick={() => setSection('team')} />}
              {capabilities.hrManage && <QuickCard icon={ClipboardList} label="Prestations" description="Déclarations et journées à vérifier." onClick={() => setSection('activity')} />}
              {capabilities.hrManage && <QuickCard icon={CalendarDays} label="Congés & absences" description="Suivi et traitement des demandes." onClick={() => setSection('leave')} />}
              {capabilities.financeManage && <QuickCard icon={WalletCards} label="Rémunérations" description="Montants mensuels et référence journalière." tag={!financeEnabled ? 'Désactivé' : undefined} onClick={() => setSection('pay')} />}
              {capabilities.financeManage && <QuickCard icon={ArrowDownUp} label="Retraits" description="Demandes et paiements enregistrés." tag={!withdrawalsEnabled ? 'Désactivé' : undefined} onClick={() => setSection('withdrawals')} />}
              {capabilities.accessManage && <QuickCard icon={FileLock2} label="Documents" description="Contrats et attestations privés." tag={!documentsEnabled ? 'Désactivé' : undefined} onClick={() => setSection('documents')} />}
              {capabilities.hrManage && <QuickCard icon={FileSpreadsheet} label="Rapports" description="Exports RH filtrés et journalisés." onClick={() => setSection('reports')} />}
              {capabilities.accessManage && <QuickCard icon={ShieldCheck} label="Accès & sécurité" description="Liaisons et périmètre des accès RH." onClick={() => setSection('access')} />}
            </div>
          </div>
          <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]"><div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400"><CircleHelp className="h-5 w-5" /></span><div><h3 className="text-sm font-bold">À savoir avant utilisation</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Le module est encore en construction. Les règles RH en RDC, les accès et les traitements financiers doivent être vérifiés avant toute utilisation réelle.</p></div></div></div>
            <div className="rounded-2xl border border-border bg-card p-5"><h3 className="text-sm font-bold">État des fonctionnalités financières</h3><div className="mt-3 flex flex-wrap gap-2"><Status enabled={financeEnabled} enabledText="Rémunérations activées" disabledText="Rémunérations désactivées" /><Status enabled={withdrawalsEnabled} enabledText="Retraits activés" disabledText="Retraits désactivés" /></div><p className="mt-3 text-xs leading-5 text-muted-foreground">Aucun transfert d’argent ni aucune retenue automatique.</p></div></div>
        </div>}
        {section === 'team' && capabilities.hrManage && <Collaborators allowAccountLinks={capabilities.accessManage} />}
        {section === 'activity' && capabilities.hrManage && <div className="space-y-4"><SubmissionReview /><Activities initialMonth={month} today={today} /></div>}
        {section === 'leave' && capabilities.hrManage && <Absences />}
        {section === 'pay' && capabilities.financeManage && <div className="space-y-4"><Remunerations enabled={financeEnabled} initialMonth={month} /><Adjustments enabled={withdrawalsEnabled} /><RhCalendar initialMonth={month} /></div>}
        {section === 'withdrawals' && capabilities.financeManage && <WithdrawalReview enabled={withdrawalsEnabled} today={today} allowOpening={capabilities.accessManage} />}
        {section === 'documents' && capabilities.accessManage && <Documents enabled={documentsEnabled} />}
        {section === 'reports' && capabilities.hrManage && <Reports today={today} />}
        {section === 'access' && capabilities.accessManage && <div className="space-y-4">
          <RoleManager />
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/[0.07] text-primary"><KeyRound className="h-5 w-5" /></span><div><h3 className="font-semibold">Accès actuellement en place</h3><p className="mt-1 text-xs text-muted-foreground">Les contrôles sont appliqués côté serveur.</p></div></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-muted/60 p-4"><p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Administrateur</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Les super-administrateurs gèrent les liaisons de comptes et les rôles, en plus des opérations RH.</p></div><div className="rounded-xl bg-muted/60 p-4"><p className="flex items-center gap-2 text-sm font-semibold"><UsersRound className="h-4 w-4 text-primary" /> Collaborateur lié</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Un compte explicitement lié peut accéder à son propre espace RH, pas aux dossiers des autres.</p></div></div>
            <button type="button" onClick={() => setSection('team')} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">Gérer les liaisons de compte <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5"><div className="flex gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" /><div><h3 className="text-sm font-bold">Activation et vérification nécessaires</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Les rôles dédiés sont désactivés par défaut. Leurs droits doivent être vérifiés avant activation ; une liaison de compte seule ne donne pas de droits de gestion RH.</p></div></div></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="flex gap-3 rounded-2xl border border-border bg-card p-4"><FileCheck2 className="h-5 w-5 shrink-0 text-primary" /><p className="text-xs leading-5 text-muted-foreground"><strong className="block text-sm text-foreground">Actions tracées</strong>Les principales opérations disposent d’un journal ; l’historique complet reste à développer.</p></div><div className="flex gap-3 rounded-2xl border border-border bg-card p-4"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /><p className="text-xs leading-5 text-muted-foreground"><strong className="block text-sm text-foreground">Validation nécessaire</strong>Les droits et la sécurité doivent être testés avant la mise en production.</p></div></div>
        </div>}
      </div>
    </div>
  </div>;
}
