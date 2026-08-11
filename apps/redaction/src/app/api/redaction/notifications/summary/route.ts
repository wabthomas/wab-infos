import { NextResponse } from 'next/server';
import {
  countPendingComments,
  getEditorStats,
  RedactionAuthError,
  requireRedactionUser,
  countImportedDrafts,
} from '@/lib/redaction/strapi-editor';

export async function GET() {
  try {
    const user = await requireRedactionUser();
    const [stats, pendingComments, importedDraftCount] = await Promise.all([
      getEditorStats(user),
      countPendingComments(),
      countImportedDrafts(user),
    ]);

    const draftCount = stats.draftCount ?? 0;
    const items: Array<{
      id: string;
      type: 'draft' | 'imported' | 'comment';
      title: string;
      body: string;
      href: string;
    }> = [];

    if (importedDraftCount > 0) {
      items.push({
        id: 'imported',
        type: 'imported',
        title: 'Imports à valider',
        body: `${importedDraftCount} article${importedDraftCount > 1 ? 's' : ''} importé${importedDraftCount > 1 ? 's' : ''} en attente`,
        href: '/articles?filter=imported',
      });
    }
    if (draftCount > 0) {
      items.push({
        id: 'drafts',
        type: 'draft',
        title: 'Brouillons',
        body: `${draftCount} brouillon${draftCount > 1 ? 's' : ''} à traiter`,
        href: '/articles?filter=draft',
      });
    }
    if (pendingComments > 0) {
      items.push({
        id: 'comments',
        type: 'comment',
        title: 'Commentaires',
        body: `${pendingComments} en attente de modération`,
        href: '/comments',
      });
    }

    return NextResponse.json({
      draftCount,
      importedDraftCount,
      pendingComments,
      badgeCount: draftCount + pendingComments,
      items,
    });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({
      draftCount: 0,
      importedDraftCount: 0,
      pendingComments: 0,
      badgeCount: 0,
      items: [],
    });
  }
}
