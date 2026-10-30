import { redirect } from 'next/navigation';
import { EmployeeIdCard } from '@/components/redaction/rh/employee-id-card';
import { getMyCollaborator, listCollaborators } from '@/lib/redaction/rh/database';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';

export default async function FichePage() {
  const principal = await requireRhPrincipal().catch(() => null);
  if (!principal) redirect('/profil');
  const person = await getMyCollaborator(principal).catch(() => null);
  if (!person) redirect('/profil');
  const full = (await listCollaborators()).find((entry) => entry.id === person.id);
  if (!full) redirect('/mon-rh');
  return <EmployeeIdCard person={full} />;
}
