import { redirect } from 'next/navigation';
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
  UsersRound,
  UserCheck,
  WalletCards,
} from 'lucide-react';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';
import { getRhFlags } from '@/lib/redaction/rh/flags';

export default async function RhMorePage() {
  let capabilities;
  try {
    capabilities = await getRhCapabilities();
  } catch {
    redirect('/');
  }

  const flags = await getRhFlags();
  const links = [
    { href: '/rh/equipe', label: 'Collaborateurs', text: 'Dossiers et comptes liés', icon: UsersRound, show: capabilities.hrManage && flags.rhEnabled },
    { href: '/rh/prestations', label: 'Prestations', text: 'Déclarations et journées', icon: ClipboardList, show: capabilities.hrManage && flags.rhEnabled },
    { href: '/rh/presence', label: 'Présence', text: 'Pointages signés par l’équipe', icon: UserCheck, show: capabilities.hrManage && flags.rhEnabled },
    { href: '/rh/conges', label: 'Congés', text: 'Demandes et validations', icon: CalendarDays, show: capabilities.hrManage && flags.rhEnabled },
    { href: '/rh/remunerations', label: 'Rémunérations', text: 'Montants mensuels', icon: WalletCards, show: capabilities.financeRead && flags.financeEnabled },
    { href: '/rh/retraits', label: 'Retraits', text: 'Soldes et paiements', icon: ArrowDownUp, show: capabilities.financeRead && flags.financeEnabled },
    { href: '/rh/documents', label: 'Documents', text: 'Contrats et attestations', icon: FileLock2, show: capabilities.accessManage && flags.documentsEnabled },
    { href: '/rh/contestations', label: 'Contestations', text: 'Recours des collaborateurs', icon: MessageSquare, show: capabilities.accessManage && flags.disputesEnabled },
    { href: '/rh/rapports', label: 'Rapports', text: 'Exports journalisés', icon: FileSpreadsheet, show: capabilities.hrManage && flags.rhEnabled },
    { href: '/rh/parametres', label: 'Paramètres', text: 'Entreprise, documents et accès', icon: Settings, show: capabilities.accessManage },
  ].filter((link) => link.show);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {links.map(({ href, label, text, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/[0.07] text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </div>
          <p className="mt-3 text-sm font-bold">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{text}</p>
        </Link>
      ))}
    </div>
  );
}
