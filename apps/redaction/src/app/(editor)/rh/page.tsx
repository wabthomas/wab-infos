import { redirect } from 'next/navigation';
import { RhDashboard } from '@/components/redaction/rh/rh-dashboard';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';
import {
  adminWithdrawalView,
  listAbsences,
  listCollaborators,
  listOpenDisputes,
  listSubmissions,
} from '@/lib/redaction/rh/database';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import type { RhCurrency } from '@/lib/redaction/rh/money';

export const dynamic = 'force-dynamic';

export default async function RhPage() {
  let capabilities;
  try {
    capabilities = await getRhCapabilities();
  } catch {
    redirect('/');
  }
  if (!capabilities.hrManage && !capabilities.financeManage && !capabilities.accessManage) {
    if (capabilities.financeRead) redirect('/rh/remunerations');
    if (capabilities.teamRead) redirect('/rh/equipe');
    redirect('/');
  }

  const flags = await getRhFlags();
  const collaborators = (await listCollaborators().catch(() => [])).filter((person) => !person.archived);

  const [absencesByPerson, submissionsByPerson, withdrawalViews, openDisputes] = await Promise.all([
    Promise.all(collaborators.map((person) => listAbsences(person.id).catch(() => []))),
    Promise.all(collaborators.map((person) => listSubmissions(person.id).catch(() => []))),
    flags.withdrawalsEnabled
      ? Promise.all(
          collaborators.map((person) =>
            adminWithdrawalView(person.id).catch(() => ({ balances: [], withdrawals: [] }))
          )
        )
      : Promise.resolve([]),
    flags.disputesEnabled ? listOpenDisputes().catch(() => []) : Promise.resolve([]),
  ]);

  const absencesPending = absencesByPerson.reduce(
    (total, rows) => total + rows.filter((row) => row.status === 'pending').length,
    0
  );
  const submissionsPending = submissionsByPerson.reduce(
    (total, rows) => total + rows.filter((row) => row.status === 'pending').length,
    0
  );

  const totals = new Map<RhCurrency, bigint>();
  const pendingWithdrawals: Array<{
    id: string;
    collaborator: string;
    amountMinor: string;
    currency: RhCurrency;
    status: string;
  }> = [];

  withdrawalViews.forEach((view, index) => {
    const person = collaborators[index];
    for (const balance of view.balances) {
      if (balance.available === null) continue;
      totals.set(balance.currency, (totals.get(balance.currency) ?? BigInt(0)) + BigInt(balance.available));
    }
    for (const withdrawal of view.withdrawals) {
      if (withdrawal.status !== 'pending' && withdrawal.status !== 'approved') continue;
      pendingWithdrawals.push({
        id: withdrawal.id,
        collaborator: `${person.firstName} ${person.lastName}`,
        amountMinor: withdrawal.amountMinor,
        currency: withdrawal.currency,
        status: withdrawal.status,
      });
    }
  });

  pendingWithdrawals.sort((a, b) => (a.status === b.status ? 0 : a.status === 'pending' ? -1 : 1));

  return (
    <RhDashboard
      capabilities={capabilities}
      collaborators={collaborators.length}
      absencesPending={absencesPending}
      submissionsPending={submissionsPending}
      withdrawalsPending={pendingWithdrawals.length}
      disputesOpen={openDisputes.length}
      balances={[...totals.entries()].map(([currency, available]) => ({
        currency,
        available: available.toString(),
      }))}
      pendingWithdrawals={pendingWithdrawals.slice(0, 8)}
    />
  );
}
