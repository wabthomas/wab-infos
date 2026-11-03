import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { EmployeeIdCard } from '@/components/redaction/rh/employee-id-card';
import { db } from '@/lib/redaction/rh/database';
import { getMyCollaborator, listCollaborators } from '@/lib/redaction/rh/database';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';

export default async function FichePage() {
  const principal = await requireRhPrincipal().catch(() => null);
  if (!principal) redirect('/profil');
  const person = await getMyCollaborator(principal).catch(() => null);
  if (!person) redirect('/profil');
  const full = (await listCollaborators()).find((entry) => entry.id === person.id);
  if (!full) redirect('/mon-rh');
  const card = await db().query(`SELECT to_char(issued_at,'YYYY-MM-DD') AS "issuedAt", (status='active' AND expires_at>=CURRENT_DATE) AS active FROM redaction_rh.service_cards WHERE collaborator_id=$1 ORDER BY issued_at DESC LIMIT 1`, [person.id]).then((result) => result.rows[0] ?? null).catch(() => null);
  return <Suspense fallback={null}><EmployeeIdCard person={full} serviceCard={card} /></Suspense>;
}
