import { redirect } from 'next/navigation';
import { MyRhDashboard } from '@/components/redaction/rh/my-rh-dashboard';
import {
  getMyCollaborator,
  listMyAbsences,
  listMyDisputes,
  listMyDocuments,
  listMyNotifications,
  myWithdrawalView,
} from '@/lib/redaction/rh/database';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';

export const dynamic = 'force-dynamic';

export default async function MyRhPage() {
  const principal = await requireRhPrincipal().catch(() => null);
  if (!principal) redirect('/profil');
  const person = await getMyCollaborator(principal).catch(() => null);
  if (!person) redirect('/profil');

  const flags = getRhFlags();
  const [absences, withdrawalView, notifications, disputes, documents] = await Promise.all([
    listMyAbsences(principal).catch(() => []),
    flags.withdrawalsEnabled ? myWithdrawalView(principal).catch(() => null) : Promise.resolve(null),
    flags.notificationsEnabled ? listMyNotifications(principal).catch(() => []) : Promise.resolve([]),
    flags.disputesEnabled ? listMyDisputes(principal).catch(() => []) : Promise.resolve([]),
    flags.documentsEnabled ? listMyDocuments(principal).catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <MyRhDashboard
      person={{ firstName: person.firstName, lastName: person.lastName }}
      balances={withdrawalView?.balances ?? []}
      withdrawals={withdrawalView?.withdrawals ?? []}
      absencesPending={absences.filter((row) => row.status === 'pending').length}
      notificationsUnread={notifications.filter((row) => !row.readAt).length}
      disputesOpen={disputes.filter((row) => row.status === 'open').length}
      documentsCount={documents.length}
      flags={flags}
    />
  );
}
