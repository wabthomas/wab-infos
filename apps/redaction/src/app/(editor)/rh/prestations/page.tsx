import { redirect } from 'next/navigation';
import { Activities } from '@/components/redaction/rh/activities';
import { SubmissionReview } from '@/components/redaction/rh/submission-review';
import { kinshasaToday } from '@/lib/redaction/rh/activities';
import { getRhCapabilities } from '@/lib/redaction/rh/authorization';

export default async function RhActivitiesPage() {
  let capabilities;
  try {
    capabilities = await getRhCapabilities();
  } catch {
    redirect('/');
  }
  if (!capabilities.hrManage) redirect('/rh');
  const today = kinshasaToday();
  return (
    <div className="space-y-5">
      <SubmissionReview />
      <Activities initialMonth={today.slice(0, 7)} today={today} />
    </div>
  );
}
