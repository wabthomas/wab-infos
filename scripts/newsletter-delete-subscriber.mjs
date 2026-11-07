import fs from 'node:fs';

// --- Lib : suppression définitive Strapi ---
let lib = fs.readFileSync('apps/redaction/src/lib/redaction/newsletter-admin.ts', 'utf8');
if (!lib.includes('deleteNewsletterSubscriber')) {
  lib += `
export async function deleteNewsletterSubscriber(documentId: string): Promise<{ email: string }> {
  const id = documentId.trim();
  if (!id) throw new Error('Abonné introuvable.');
  const existing = await strapi<{ data?: { documentId?: string; email?: string } | null }>(
    \`/subscribers/\${encodeURIComponent(id)}?fields[0]=email\`
  );
  if (existing.status === 401 || existing.status === 403) {
    throw new Error('Le jeton API n’a pas le droit de supprimer les abonnés.');
  }
  const email = existing.data?.data?.email?.trim() || '';
  const removed = await strapi<unknown>(\`/subscribers/\${encodeURIComponent(id)}\`, { method: 'DELETE' });
  if (removed.status === 401 || removed.status === 403) {
    throw new Error('Le jeton API n’a pas le droit de supprimer les abonnés.');
  }
  if (removed.status === 404) {
    const already = await strapi<unknown>(\`/subscribers/\${encodeURIComponent(id)}\`);
    if (already.status === 404) return { email };
  }
  if (removed.status !== 200 && removed.status !== 204) {
    throw new Error(\`Suppression impossible (Strapi \${removed.status}).\`);
  }
  return { email };
}
`;
}
fs.writeFileSync('apps/redaction/src/lib/redaction/newsletter-admin.ts', lib, 'utf8');
console.log('LIB', lib.includes('deleteNewsletterSubscriber') ? 'OK' : 'MISS');

// --- Route DELETE ---
let route = fs.readFileSync('apps/redaction/src/app/api/redaction/newsletter/subscribers/route.ts', 'utf8');
route = route.replace(
  "import { addNewsletterSubscribers, listNewsletterSubscribers } from '@/lib/redaction/newsletter-admin';",
  "import { addNewsletterSubscribers, listNewsletterSubscribers, deleteNewsletterSubscriber } from '@/lib/redaction/newsletter-admin';",
);
if (!route.includes('export async function DELETE')) {
  route += `
export async function DELETE(request: Request) {
  try {
    const forbidden = await requireAdmin();
    if (forbidden) return forbidden;
    const body = (await request.json()) as { documentId?: string };
    const documentId = body.documentId?.trim();
    if (!documentId) return NextResponse.json({ error: 'Abonné introuvable.' }, { status: 400 });
    const result = await deleteNewsletterSubscriber(documentId);
    return NextResponse.json({ deleted: true, email: result.email });
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Suppression impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
`;
}
fs.writeFileSync('apps/redaction/src/app/api/redaction/newsletter/subscribers/route.ts', route, 'utf8');
console.log('ROUTE', route.includes('export async function DELETE') ? 'OK' : 'MISS');

// --- UI ---
let ui = fs.readFileSync('apps/redaction/src/components/redaction/newsletter-desk.tsx', 'utf8');
ui = ui.replace("import { Loader2, Mail, Send, Upload, UserMinus } from 'lucide-react';", "import { Loader2, Mail, Send, Trash2, Upload, UserMinus } from 'lucide-react';");
ui = ui.replace(
  "  const [unsubscribingId, setUnsubscribingId] = useState<string | null>(null);",
  "  const [unsubscribingId, setUnsubscribingId] = useState<string | null>(null);\n  const [deletingId, setDeletingId] = useState<string | null>(null);",
);
if (!ui.includes('async function deleteRow')) {
  ui = ui.replace(
    "  async function submitEmails(raw: string) {",
    `  async function deleteRow(row: NewsletterSubscriberRow) {
    const ok = window.confirm(
      \`Supprimer définitivement \${row.email} de la liste ?\\n\\nAucun e-mail ne sera envoyé et l'abonné ne pourra plus être réactivé sans réimport.\`
    );
    if (!ok) return;
    setDeletingId(row.documentId);
    try {
      const response = await fetchRedaction('/api/redaction/newsletter/subscribers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: row.documentId }),
      });
      const data = await readApiJsonResponse<{ email?: string; deleted?: boolean; error?: string }>(response);
      if (!response.ok) throw new Error(data.error || 'Suppression impossible');
      toast.success('Supprimé', data.email || row.email);
      const nextPage = rows.length === 1 && page > 1 ? page - 1 : page;
      await loadList(nextPage, query);
    } catch (error) {
      toast.error('Suppression', error instanceof Error ? error.message : 'Erreur');
    } finally {
      setDeletingId(null);
    }
  }

  async function submitEmails(raw: string) {`,
  );
  ui = ui.replace(
    `                    <td className="py-2.5">
                      {row.status === 'active' ? (
                        <button
                          type="button"
                          disabled={unsubscribingId === row.documentId}
                          onClick={() => void unsubscribeRow(row)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold hover:bg-muted disabled:opacity-60"
                          title="Désinscrire et notifier"
                        >
                          {unsubscribingId === row.documentId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserMinus className="h-3.5 w-3.5" />
                          )}
                          Désinscrire
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>`,
    `                    <td className="py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {row.status === 'active' && (
                          <button
                            type="button"
                            disabled={unsubscribingId === row.documentId}
                            onClick={() => void unsubscribeRow(row)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold hover:bg-muted disabled:opacity-60"
                            title="Désinscrire et notifier"
                          >
                            {unsubscribingId === row.documentId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserMinus className="h-3.5 w-3.5" />
                            )}
                            Désinscrire
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={deletingId === row.documentId}
                          onClick={() => void deleteRow(row)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-300 px-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                          title="Supprimer définitivement de la liste"
                        >
                          {deletingId === row.documentId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          Supprimer
                        </button>
                      </div>
                    </td>`,
  );
}
fs.writeFileSync('apps/redaction/src/components/redaction/newsletter-desk.tsx', ui, 'utf8');
console.log('UI', ui.includes('deleteRow') && ui.includes('Supprimer') ? 'OK' : 'MISS');
