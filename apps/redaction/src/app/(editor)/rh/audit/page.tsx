import { redirect } from 'next/navigation';
import { History } from 'lucide-react';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';
import { listAuditLog } from '@/lib/redaction/rh/database';

export const dynamic = 'force-dynamic';

const LABELS: Record<string, string> = {
  create: 'Création', update: 'Modification', archive: 'Archivage',
  withdrawal_create: 'Demande de retrait', withdrawal_cancel: 'Retrait annulé',
  withdrawal_decide: 'Décision de retrait', withdrawal_pay: 'Paiement de retrait',
  absence_create: 'Demande d absence', absence_decide: 'Décision d absence',
  profile_self_update: 'Fiche mise à jour (collaborateur)', profile_admin_update: 'Fiche mise à jour (admin)',
  document_create: 'Document ajouté', document_archive: 'Document archivé', document_download: 'Document téléchargé',
  role_grant: 'Rôle attribué', role_revoke: 'Rôle retiré', account_link: 'Compte lié',
  payout_method_create: 'Moyen de retrait ajouté', attendance_in: 'Arrivée signée', attendance_out: 'Sortie signée',
  opening_balance_create: 'Solde initial', adjustment_create: 'Ajustement créé',
  remuneration_create: 'Rémunération créée', remuneration_validate: 'Rémunération validée',
  dispute_create: 'Contestation ouverte', dispute_answer: 'Contestation répondue',
};

export default async function AuditPage() {
  let capabilities;
  try { capabilities = await getRhCapabilities(); } catch { redirect('/'); }
  if (!capabilities.hrManage && !capabilities.accessManage) redirect('/rh');
  const entries = await listAuditLog().catch(() => []);
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><History className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-bold">Journal d audit</h2><p className="mt-1 text-sm text-muted-foreground">Derniers mouvements enregistrés dans le module RH.</p></div></div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Collaborateur</th><th className="px-4 py-3">Auteur</th></tr></thead>
            <tbody>
              {entries.length === 0 ? <tr><td colSpan={4} className="px-4 py-6 text-muted-foreground">Aucun mouvement enregistré.</td></tr> : entries.map((entry) => (
                <tr key={entry.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{entry.createdAt}</td>
                  <td className="px-4 py-3 font-medium">{LABELS[entry.action] ?? entry.action}</td>
                  <td className="px-4 py-3">{entry.collaborator ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{entry.actorEmail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}