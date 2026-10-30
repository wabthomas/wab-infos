import { MySubmissions } from '@/components/redaction/rh/my-submissions';
import { kinshasaToday } from '@/lib/redaction/rh/activities';

export default function MyActivitiesPage() {
  return <MySubmissions today={kinshasaToday()} />;
}
