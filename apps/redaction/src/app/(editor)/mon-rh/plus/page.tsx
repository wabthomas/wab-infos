import Link from 'next/link';
import { ArrowRight, Settings, Bell, CalendarDays, ClipboardList, FileLock2, FileSpreadsheet, MessageSquare, User, UserCheck, WalletCards, ArrowDownUp, BadgeCheck, MessageCircle } from 'lucide-react';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { isRhOnlyUser } from '@/lib/redaction/editorial-access';
import { requireRedactionUser } from '@/lib/redaction/strapi-editor';

export default async function MyRhMorePage() {
  const user = await requireRedactionUser();
  const rhOnly = await isRhOnlyUser(user);
  const flags = await getRhFlags();
  const links = [
    { href: '/mon-rh/conges', label: 'Mes congÃ©s', text: 'Demander une absence', icon: CalendarDays, show: true },
    { href: '/mon-rh/presence', label: 'Ma prÃ©sence', text: 'Signer arrivÃ©e et sortie', icon: UserCheck, show: true },
    { href: '/mon-rh/fiche', label: 'Ma fiche', text: 'Fiche dâ€™identification', icon: FileSpreadsheet, show: true },
    { href: '/mon-rh/carte-service', label: 'Carte de service', text: 'Carte professionnelle recto-verso', icon: BadgeCheck, show: flags.serviceCardsEnabled },
    { href: '/mon-rh/chat', label: 'Chat RH', text: 'Groupe et discussions privÃ©es', icon: MessageCircle, show: flags.chatEnabled },
    { href: '/mon-rh/remunerations', label: 'Mes rÃ©munÃ©rations', text: 'Montants validÃ©s', icon: WalletCards, show: flags.financeEnabled },
    { href: '/mon-rh/paiements-anciens', label: 'Anciens paiements', text: 'Reconstituer vos paiements reÃ§us', icon: WalletCards, show: true },
    { href: '/mon-rh/retraits', label: 'Mes retraits', text: 'Soldes et demandes', icon: ArrowDownUp, show: flags.financeEnabled && flags.withdrawalsEnabled },
    { href: '/mon-rh/prestations', label: 'Mes prestations', text: 'DÃ©clarer une journÃ©e', icon: ClipboardList, show: true },
    { href: '/mon-rh/documents', label: 'Mes documents', text: 'Contrats et attestations', icon: FileLock2, show: flags.documentsEnabled },
    { href: '/mon-rh/contestations', label: 'Mes contestations', text: 'Signaler un dÃ©saccord', icon: MessageSquare, show: flags.disputesEnabled },
    { href: '/mon-rh/notifications', label: 'Mes notifications', text: 'Ã‰vÃ©nements RH', icon: Bell, show: flags.notificationsEnabled },
    { href: '/profil', label: 'Mon profil', text: 'Compte et prÃ©fÃ©rences', icon: User, show: !rhOnly },
  ].filter((link) => link.show);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
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
