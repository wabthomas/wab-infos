import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { EmployeeIdCard } from '@/components/redaction/rh/employee-id-card';
import { db } from '@/lib/redaction/rh/database';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';
import { listCollaborators } from '@/lib/redaction/rh/database';

export const dynamic = 'force-dynamic';

export default async function AdminEmployeeFichePage({ params }: { params: Promise<{ id: string }> }) {
  let capabilities;
  try { capabilities = await getRhCapabilities(); }
  catch { redirect('/'); }
  if (!capabilities.hrManage) redirect('/rh/equipe');

  const { id } = await params;
  const person = (await listCollaborators()).find((collaborator) => collaborator.id === id);
  if (!person) notFound();
  const card = await db().query(`SELECT to_char(issued_at,'YYYY-MM-DD') AS "issuedAt", (status='active' AND expires_at>=CURRENT_DATE) AS active FROM redaction_rh.service_cards WHERE collaborator_id=$1 ORDER BY issued_at DESC LIMIT 1`, [id]).then((result) => result.rows[0] ?? null).catch(() => null);
  return <Suspense fallback={null}><EmployeeIdCard person={person} adminPersonId={id} serviceCard={card} /></Suspense>;
}
