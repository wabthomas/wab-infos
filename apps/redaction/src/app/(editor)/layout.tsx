import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { RedactionShell } from '@/components/redaction/redaction-shell';
import { RedactionPushSetup } from '@/components/redaction/redaction-push-setup';
import { SIDEBAR_COOKIE } from '@/lib/redaction/sidebar-pref';
import { isRhOnlyUser } from '@/lib/redaction/editorial-access';
import {
  countPendingComments,
  getEditorProfile,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';
import { getStrapiMediaUrl } from '@/lib/utils';

export default async function RedactionEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let shellProps: {
    authorName: string;
    avatarUrl?: string;
    isSuperAdmin: boolean;
    pendingComments: number;
    rhOnly: boolean;
  };

  try {
    const user = await requireRedactionUser();
    const rhOnly = await isRhOnlyUser(user);
    if (rhOnly) {
      // Do not load editorial profile or editorial notifications for RH-only accounts.
      shellProps = { authorName: 'Mon espace RH', isSuperAdmin: false, pendingComments: 0, rhOnly: true };
    } else {
      const [{ author, isSuperAdmin }, pendingComments] = await Promise.all([
        getEditorProfile(user),
        countPendingComments(),
      ]);
      shellProps = {
        authorName: author.name,
        avatarUrl: author.avatar?.url
          ? getStrapiMediaUrl(author.avatar.url) ?? author.avatar.url
          : undefined,
        isSuperAdmin,
        pendingComments,
        rhOnly: false,
      };
    }
  } catch {
    redirect('/login');
  }

  const cookieStore = await cookies();
  const sidebarCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === '1';

  return (
    <>
      <RedactionPushSetup />
      <RedactionShell
        managementNotificationsEnabled={process.env.REDACTION_RH_MANAGEMENT_NOTIFICATIONS_ENABLED === 'true'}
        authorName={shellProps.authorName}
        avatarUrl={shellProps.avatarUrl}
        isSuperAdmin={shellProps.isSuperAdmin}
        rhOnly={shellProps.rhOnly}
        initialPendingComments={shellProps.pendingComments}
        initialSidebarCollapsed={sidebarCollapsed}
      >
        {children}
      </RedactionShell>
    </>
  );
}
