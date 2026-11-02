import { RecordSheets } from '@/components/redaction/rh/record-sheets';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { offlineOwner } from '@/lib/redaction/rh/offline-queue';
import { AttendanceSign } from '@/components/redaction/rh/attendance-sign';

export default async function MyAttendancePage() {
  const principal = await requireRhPrincipal();
  return <div className="space-y-5"><AttendanceSign owner={offlineOwner(principal.id, principal.email)} /><RecordSheets type="presence" /></div>;
}
