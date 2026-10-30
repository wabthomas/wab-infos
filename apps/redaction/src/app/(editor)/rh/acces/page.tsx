import { redirect } from 'next/navigation';
import { ArrowRight, FileCheck2, KeyRound, ShieldCheck, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { RoleManager } from '@/components/redaction/rh/role-manager';
import { FeatureSettings } from '@/components/redaction/rh/feature-settings';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';

export default async function RhAccessPage() {
  let capabilities;
  try {
    capabilities = await getRhCapabilities();
  } catch {
    redirect('/');
  }
  if (!capabilities.accessManage) redirect('/rh');

  return (
    <div className="space-y-5">
      <FeatureSettings />
      <RoleManager />

      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/[0.07] text-primary">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold">Accès actuellement en place</h2>
            <p className="mt-1 text-xs text-muted-foreground">Les contrôles sont appliqués côté serveur.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-muted/60 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" /> Administrateur
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Les super-administrateurs gèrent les liaisons de comptes et les rôles, en plus des opérations RH.
            </p>
          </div>
          <div className="rounded-xl bg-muted/60 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <UsersRound className="h-4 w-4 text-primary" /> Collaborateur lié
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Un compte explicitement lié peut accéder à son propre espace RH, pas aux dossiers des autres.
            </p>
          </div>
        </div>
        <Link
          href="/rh/equipe"
          className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
        >
          Gérer les liaisons de compte <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
          <FileCheck2 className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-xs leading-5 text-muted-foreground">
            <strong className="block text-sm text-foreground">Actions tracées</strong>
            Les principales opérations disposent d’un journal ; l’historique complet reste à développer.
          </p>
        </div>
        <div className="flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs leading-5 text-muted-foreground">
            <strong className="block text-sm text-foreground">Validation nécessaire</strong>
            Les droits et la sécurité doivent être testés avant une utilisation réelle.
          </p>
        </div>
      </div>
    </div>
  );
}
