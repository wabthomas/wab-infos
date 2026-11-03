import { redirect } from 'next/navigation';
import { History } from 'lucide-react';
import { AuditJournal } from '@/components/redaction/rh/audit-journal';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  let capabilities;
  try {
    capabilities = await getRhCapabilities();
  } catch {
    redirect('/');
  }
  if (!capabilities.hrManage && !capabilities.accessManage) redirect('/rh');

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <History className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold">Journal d’audit</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Historique paginé des mouvements enregistrés dans le module RH.
            </p>
          </div>
        </div>
      </section>
      <AuditJournal />
    </div>
  );
}
