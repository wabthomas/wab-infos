import { redirect } from 'next/navigation';
import { Building2, Settings2, ShieldCheck } from 'lucide-react';
import { OrganizationSettings } from '@/components/redaction/rh/organization-settings';
import { AnnouncementSettings } from '@/components/redaction/rh/announcement-settings';
import { FeatureSettings } from '@/components/redaction/rh/feature-settings';
import { RoleManager } from '@/components/redaction/rh/role-manager';
import { RhVoiceAdminTest } from '@/components/redaction/rh/rh-voice-admin-test';
import { RhEmailSettings } from '@/components/redaction/rh/rh-email-settings';
import { RhSettingsTabs } from '@/components/redaction/rh/rh-settings-tabs';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';

export const dynamic = 'force-dynamic';

export default async function RhSettingsPage() {
  let capabilities;
  try { capabilities = await getRhCapabilities(); }
  catch { redirect('/'); }
  if (!capabilities.accessManage) redirect('/rh');

  return <div className="space-y-6">
    <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.10] via-card to-card">
      <div className="flex flex-wrap items-start gap-3 p-5 sm:p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Settings2 className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Administration RH</p>
          <h2 className="mt-1 font-display text-xl font-bold">Paramètres RH</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Identité de l'entreprise, e-mails, annonces, fonctionnalités et rôles : tout est organisé par onglets.</p>
        </div>
      </div>
      <div className="flex items-start gap-2 border-t border-primary/10 bg-primary/[0.03] px-4 py-2.5 text-xs leading-5 text-amber-900 dark:text-amber-200"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Ces réglages sont réservés aux super-administrateurs RH et ne sont pas modifiables par les collaborateurs.</div>
    </div>

    <RhSettingsTabs tabs={[
      { id: 'organisation', label: 'Entreprise & documents', description: 'Coordonnées, logo, sceaux, signatures et mentions officielles.', icon: 'building', content: <OrganizationSettings /> },
      { id: 'email', label: 'E-mails RH', description: 'Serveur SMTP N0C dédié aux notifications push + e-mail.', icon: 'mail', content: <RhEmailSettings /> },
      { id: 'annonce', label: 'Annonce collaborateurs', description: 'Message important affiché à l’ouverture de l’espace RH.', icon: 'announcement', content: <AnnouncementSettings /> },
      { id: 'voice', label: 'Voix des actions RH', description: 'Tester les annonces vocales de pointage et de prestation.', icon: 'voice', content: <RhVoiceAdminTest /> },
      { id: 'features', label: 'Fonctionnalités', description: 'Activer ou désactiver les modules du RH et leurs accès.', icon: 'features', content: <FeatureSettings /> },
      { id: 'roles', label: 'Rôles & accès', description: 'Attribuer les rôles RH délégués aux comptes autorisés.', icon: 'roles', content: <RoleManager /> },
    ]} />

    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-xs leading-5 text-muted-foreground"><Building2 className="h-5 w-5 shrink-0 text-primary" />Les signatures, sceaux et logos sont enregistrés dans la base RH privée. Les réglages SMTP et les rôles sont journalisés et réservés à l’administration.</div>
  </div>;
}
