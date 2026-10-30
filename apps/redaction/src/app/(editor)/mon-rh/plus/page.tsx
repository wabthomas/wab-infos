import Link from 'next/link';
import { ArrowRight, Bell, CalendarDays, ClipboardList, FileLock2, FileSpreadsheet, MessageSquare, User, UserCheck, WalletCards, ArrowDownUp } from 'lucide-react';
import { getRhFlags } from '@/lib/redaction/rh/flags';

export default function MyRhMorePage() {
  const flags = getRhFlags();
  const links = [
    { href: '/mon-rh/conges', label: 'Mes congés', text: 'Demander une absence', icon: CalendarDays, show: true },
    { href: '/mon-rh/presence', label: 'Ma présence', text: 'Signer arrivée et sortie', icon: UserCheck, show: true },
    { href: '/mon-rh/fiche', label: 'Ma fiche', text: 'Fiche d’identification', icon: FileSpreadsheet, show: true },
    { href: '/mon-rh/remunerations', label: 'Mes rémunérations', text: 'Montants validés', icon: WalletCards, show: flags.financeEnabled },
    { href: '/mon-rh/retraits', label: 'Mes retraits', text: 'Soldes et demandes', icon: ArrowDownUp, show: flags.financeEnabled && flags.withdrawalsEnabled },
    { href: '/mon-rh/prestations', label: 'Mes prestations', text: 'Déclarer une journée', icon: ClipboardList, show: true },
    { href: '/mon-rh/documents', label: 'Mes documents', text: 'Contrats et attestations', icon: FileLock2, show: flags.documentsEnabled },
    { href: '/mon-rh/contestations', label: 'Mes contestations', text: 'Signaler un désaccord', icon: MessageSquare, show: flags.disputesEnabled },
    { href: '/mon-rh/notifications', label: 'Mes notifications', text: 'Événements RH', icon: Bell, show: flags.notificationsEnabled },
    { href: '/profil', label: 'Mon profil', text: 'Compte et préférences', icon: User, show: true },
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
