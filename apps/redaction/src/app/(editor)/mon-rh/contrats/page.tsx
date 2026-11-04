import { redirect } from 'next/navigation';
import { getRhFlags } from '@/lib/redaction/rh/flags';
import { MyContracts } from '@/components/redaction/rh/my-contracts';
export default async function MyContractsPage() { if (!(await getRhFlags()).contractsEnabled) redirect('/mon-rh'); return <MyContracts />; }
