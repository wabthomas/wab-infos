import { redirect } from 'next/navigation';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { ServiceCard } from '@/components/redaction/rh/service-card';
import { getMyCollaborator } from '@/lib/redaction/rh/database';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
export default async function ServiceCardPage(){if(!(await getRhFlags()).serviceCardsEnabled)redirect('/mon-rh');const person=await getMyCollaborator(await requireRhPrincipal()).catch(()=>null);return <ServiceCard collaboratorId={person?.id}/>;}
