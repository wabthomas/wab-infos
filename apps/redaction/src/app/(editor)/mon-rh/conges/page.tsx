import { requireRhPrincipal } from '@/lib/redaction/rh/identity';
import { offlineOwner } from '@/lib/redaction/rh/offline-queue';
import { getMyCollaborator } from '@/lib/redaction/rh/database';
import { MyAbsences } from '@/components/redaction/rh/my-absences';

export default async function MyLeavePage() {
  const principal = await requireRhPrincipal();
  const collaborator = await getMyCollaborator(principal);
  return <MyAbsences owner={offlineOwner(principal.id, principal.email)} collaboratorId={collaborator?.id ?? ''} />;
}
