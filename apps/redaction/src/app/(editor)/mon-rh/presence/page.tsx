import { AttendanceSign } from '@/components/redaction/rh/attendance-sign';
import { kinshasaToday } from '@/lib/redaction/rh/activities';

export default function MyAttendancePage() {
  return <AttendanceSign today={kinshasaToday()} />;
}
