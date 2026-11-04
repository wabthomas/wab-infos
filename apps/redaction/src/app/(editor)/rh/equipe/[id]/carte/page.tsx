import { redirect } from 'next/navigation';
import { ServiceCard } from '@/components/redaction/rh/service-card';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';
import { getRhFlags } from '@/lib/redaction/rh/flags';
export const dynamic='force-dynamic';
export default async function AdminServiceCardPage({params}:{params:Promise<{id:string}>}) {
  const capabilities=await getRhCapabilities().catch(()=>null);
  if(!capabilities?.hrManage || !(await getRhFlags()).serviceCardsEnabled)redirect('/rh/equipe');
  const {id}=await params;
  if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))redirect('/rh/equipe');
  return <ServiceCard adminPersonId={id}/>;
}
