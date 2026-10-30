import { redirect } from 'next/navigation';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { ServiceCard } from '@/components/redaction/rh/service-card';
export default async function ServiceCardPage(){if(!(await getRhFlags()).serviceCardsEnabled)redirect('/mon-rh');return <ServiceCard/>;}
