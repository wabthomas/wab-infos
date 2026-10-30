import { redirect } from 'next/navigation';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { RhChat } from '@/components/redaction/rh/chat';
export default async function ChatPage(){if(!(await getRhFlags()).chatEnabled)redirect('/mon-rh');return <RhChat/>;}
