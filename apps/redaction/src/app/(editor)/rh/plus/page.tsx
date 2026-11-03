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
    { href: '/rh/conges', label: 'Congés', text: 'Demandes et validations', icon: CalendarDays, show: capabilities.hrManage && flags.rhEnabled },
    { href: '/rh/remunerations', label: 'Rémunérations', text: 'Montants mensuels', icon: WalletCards, show: capabilities.financeRead && flags.financeEnabled },
    { href: '/rh/paiements-anciens', label: 'Paiements historiques', text: 'Rattrapage et bilan', icon: FileSpreadsheet, show: capabilities.financeRead && flags.financeEnabled },
    { href: '/rh/retraits', label: 'Retraits', text: 'Soldes et paiements', icon: ArrowDownUp, show: capabilities.financeRead && flags.financeEnabled },
    { href: '/rh/documents', label: 'Documents', text: 'Contrats et attestations', icon: FileLock2, show: capabilities.accessManage && flags.documentsEnabled },
    { href: '/rh/contrats', label: 'Contrats CDD / CDI', text: 'Préparer un projet de contrat', icon: FileLock2, show: capabilities.accessManage },
    { href: '/rh/correspondance', label: 'Correspondance RH', text: 'Lettres et communiqués officiels', icon: FileSpreadsheet, show: capabilities.accessManage },
    { href: '/rh/contestations', label: 'Contestations', text: 'Recours des collaborateurs', icon: MessageSquare, show: capabilities.accessManage && flags.disputesEnabled },
    { href: '/rh/rapports', label: 'Rapports', text: 'Exports journalisés', icon: FileSpreadsheet, show: capabilities.hrManage && flags.rhEnabled },
    { href: '/rh/parametres', label: 'Paramètres', text: 'Entreprise, documents et accès', icon: Settings, show: capabilities.accessManage },
  ].filter((link) => link.show);

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
      {links.map(({ href, label, text, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="group rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/30 sm:rounded-2xl sm:p-5 sm:transition-all sm:hover:-translate-y-0.5 sm:hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.07] text-primary sm:h-11 sm:w-11 sm:rounded-xl">
              <Icon className="h-5 w-5" />
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </div>
          <p className="mt-2 text-xs font-bold sm:mt-3 sm:text-sm">{label}</p>
          <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground sm:text-xs">{text}</p>
        </Link>
      ))}
    </div>
  );
}
