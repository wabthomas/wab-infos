import { youtubePerformanceEnabled } from '@/lib/redaction/rh/youtube-performance-server';
import { RecordSheets } from '@/components/redaction/rh/record-sheets';
import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { offlineOwner } from '@/lib/redaction/rh/offline-queue';
import { MySubmissions } from '@/components/redaction/rh/my-submissions';
import { kinshasaToday } from '@/lib/redaction/rh/activities';

export default async function MyActivitiesPage() {
  const principal = await requireRhPrincipal();
  return <div className="space-y-5"><MySubmissions youtubeEnabled={youtubePerformanceEnabled()} owner={offlineOwner(principal.id, principal.email)} today={kinshasaToday()} /><RecordSheets type="prestations" /></div>;
}
