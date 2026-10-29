import { redirect } from 'next/navigation';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { getMyCollaborator } from '@/lib/redaction/rh/database';
import { kinshasaToday } from '@/lib/redaction/rh/activities';
import { MyRh } from '@/components/redaction/rh/my-rh';

export default async function MyRhPage() {
  let person;
  try { person = await getMyCollaborator(await requireRhPrincipal()); } catch { redirect('/profil'); }
  if (!person) redirect('/profil');
  return <MyRh documentsEnabled={process.env.REDACTION_RH_DOCUMENTS_ENABLED === 'true'} notificationsEnabled={process.env.REDACTION_RH_NOTIFICATIONS_ENABLED === 'true'} today={kinshasaToday()} financeEnabled={process.env.REDACTION_RH_FINANCE_ENABLED === 'true'} withdrawalsEnabled={process.env.REDACTION_RH_FINANCE_ENABLED === 'true' && process.env.REDACTION_RH_WITHDRAWALS_ENABLED === 'true'} />;
}
