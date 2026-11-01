import { redirect } from 'next/navigation';
import { AttendanceReview } from '@/components/redaction/rh/attendance-review';
import { kinshasaToday } from '@/lib/redaction/rh/activities';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';

export const dynamic = 'force-dynamic';

export default async function RhAttendancePage() {
  let capabilities;
  try {
    capabilities = await getRhCapabilities();
  } catch {
    redirect('/');
  }
  if (!capabilities.hrManage) redirect('/rh');
  const today = kinshasaToday();
  return <AttendanceReview initialMonth={today.slice(0, 7)} today={today} />;
}
