import { redirect } from 'next/navigation';
import { Building2, Settings2, ShieldCheck } from 'lucide-react';
import { OrganizationSettings } from '@/components/redaction/rh/organization-settings';
import { FeatureSettings } from '@/components/redaction/rh/feature-settings';
import { RoleManager } from '@/components/redaction/rh/role-manager';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';

export const dynamic = 'force-dynamic';

export default async function RhSettingsPage() {
  let capabilities;
  try { capabilities = await getRhCapabilities(); }
  catch { redirect('/'); }
  if (!capabilities.accessManage) redirect('/rh');

  return <div className="space-y-6">
    <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/[0.08] via-card to-card p-5 sm:p-7">
      <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Settings2 className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Administration RH</p><h2 className="mt-1 font-display text-xl font-bold">Paramètres de l’entreprise</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Gérez ici les coordonnées et l’identité officielle utilisées dans les documents RH, ainsi que les fonctionnalités et les rôles du module.</p></div></div>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs leading-5 text-amber-900 dark:text-amber-200"><ShieldCheck className="h-4 w-4 shrink-0" />Ces réglages sont réservés aux super-administrateurs RH et ne sont pas modifiables par les collaborateurs.</div>
    </div>
    <OrganizationSettings />
    <FeatureSettings />
    <RoleManager />
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-xs leading-5 text-muted-foreground"><Building2 className="h-5 w-5 shrink-0 text-primary" />Les signatures, sceaux et logos sont enregistrés dans la base RH. La migration des fiches doit être appliquée pour rendre ces paramètres disponibles.</div>
  </div>;
}
