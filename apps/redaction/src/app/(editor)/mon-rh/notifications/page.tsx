import { redirect } from 'next/navigation';
import { MyNotifications } from '@/components/redaction/rh/my-notifications';
import { getRhFlags } from '@/lib/redaction/rh/flags';

export default function MyNotificationsPage() {
  if (!getRhFlags().notificationsEnabled) redirect('/mon-rh');
  return <MyNotifications />;
}
