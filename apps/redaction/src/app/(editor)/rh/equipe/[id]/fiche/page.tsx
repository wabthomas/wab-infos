import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { EmployeeIdCard } from '@/components/redaction/rh/employee-id-card';
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
  return <Suspense fallback={null}><EmployeeIdCard person={person} adminPersonId={id} /></Suspense>;
}
