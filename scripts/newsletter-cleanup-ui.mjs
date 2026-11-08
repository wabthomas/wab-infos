import fs from 'node:fs';

// 1) Corriger le shape de listNewsletterSubscribers dans le module de nettoyage.
let cleanup = fs.readFileSync('apps/redaction/src/lib/redaction/newsletter-cleanup.ts', 'utf8');
cleanup = cleanup.replace('rows.push(...list.subscribers.map', 'rows.push(...list.rows.map');
fs.writeFileSync('apps/redaction/src/lib/redaction/newsletter-cleanup.ts', cleanup, 'utf8');
console.log('CLEANUP', cleanup.includes('list.rows.map') ? 'OK' : 'MISS');

// 2) Route API de nettoyage complet.
const routeDir = 'apps/redaction/src/app/api/redaction/newsletter/subscribers/cleanup';
fs.mkdirSync(routeDir, { recursive: true });
fs.writeFileSync(`${routeDir}/route.ts`, `import { requireEditorialUser } from '@/lib/redaction/editorial-access';
import { NextResponse } from 'next/server';
import { cleanNewsletterSubscribers } from '@/lib/redaction/newsletter-cleanup';
import { isRedactionSuperAdmin, RedactionAuthError, requireRedactionUser } from '@/lib/redaction/strapi-editor';

export async function POST(request: Request) {
  try {
    const user = await requireEditorialUser();
    if (!isRedactionSuperAdmin(user)) {
      return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
    }
    let body: { deleteInvalid?: boolean } = {};
    try { body = (await request.json()) as { deleteInvalid?: boolean }; } catch { /* corps vide accepté */ }
    const report = await cleanNewsletterSubscribers({ deleteInvalid: body.deleteInvalid !== false });
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Nettoyage impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
`, 'utf8');
console.log('ROUTE OK');

// 3) UI : bouton + rapport dans la section Abonnés.
let desk = fs.readFileSync('apps/redaction/src/components/redaction/newsletter-desk.tsx', 'utf8');
desk = desk.replace("import { Loader2, Mail, Send, Trash2, Upload, UserMinus } from 'lucide-react';", "import { AlertTriangle, Loader2, Mail, Send, Sparkles, Trash2, Upload, UserMinus } from 'lucide-react';");
desk = desk.replace(
  "  const [deletingId, setDeletingId] = useState<string | null>(null);",
  "  const [deletingId, setDeletingId] = useState<string | null>(null);\n  const [cleaning, setCleaning] = useState(false);\n  const [cleanup, setCleanup] = useState<{ checked: number; valid: number; deleted: number; duplicates: number; suspicious: Array<{ email: string; reasons: string[] }>; invalid: Array<{ email: string; reasons: string[] }>; deleteErrors: string[] } | null>(null);",
);
if (!desk.includes('async function cleanSubscribers')) {
  desk = desk.replace(
    "  async function deleteRow(row: NewsletterSubscriberRow) {",
    `  async function cleanSubscribers() {
    const ok = window.confirm(
      'Analyser toute la liste des abonnés et supprimer définitivement les adresses invalides (format, doublon, domaine sans messagerie, adresse jetable) ?\\n\\nLes adresses de rôle (info@, contact@…) seront conservées mais envoyées en dernier.'
    );
    if (!ok) return;
    setCleaning(true);
    try {
      const response = await fetchRedaction('/api/redaction/newsletter/subscribers/cleanup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deleteInvalid: true }),
      });
      const data = await readApiJsonResponse<{ checked: number; valid: number; deleted: number; duplicates: number; suspicious: Array<{ email: string; reasons: string[] }>; invalid: Array<{ email: string; reasons: string[] }>; deleteErrors: string[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error || 'Nettoyage impossible');
      setCleanup(data);
      toast.success('Nettoyage terminé', `${data.deleted} adresse(s) invalide(s) supprimée(s) sur ${data.checked} vérifiée(s).`);
      await loadList(1, query);
    } catch (error) {
      toast.error('Nettoyage', error instanceof Error ? error.message : 'Erreur');
    } finally {
      setCleaning(false);
    }
  }

  async function deleteRow(row: NewsletterSubscriberRow) {`,
  );
}
desk = desk.replace(
  `<h2 className="font-display text-lg font-bold">Abonnés</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {active} actif(s) · {total} au total
            </p>
          </div>
        </div>`,
  `<h2 className="font-display text-lg font-bold">Abonnés</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {active} actif(s) · {total} au total
            </p>
          </div>
          <button type="button" onClick={() => void cleanSubscribers()} disabled={cleaning} className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {cleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Nettoyer la liste
          </button>
        </div>
        {cleanup && <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
          <p className="font-semibold">Dernier nettoyage : {cleanup.checked} vérifiée(s) · {cleanup.valid} valide(s) · {cleanup.deleted} supprimée(s) · {cleanup.duplicates} doublon(s)</p>
          {cleanup.suspicious.length > 0 && <details className="mt-2"><summary className="cursor-pointer font-semibold text-amber-700 dark:text-amber-300">{cleanup.suspicious.length} adresse(s) suspecte(s) conservée(s) — envoyées en dernier</summary><ul className="mt-1 max-h-40 space-y-1 overflow-auto text-xs text-muted-foreground">{cleanup.suspicious.slice(0, 50).map(row => <li key={row.email}>{row.email} — {row.reasons.join(', ')}</li>)}</ul></details>}
          {cleanup.invalid.length > 0 && <details className="mt-2"><summary className="cursor-pointer font-semibold text-red-700 dark:text-red-300">{cleanup.invalid.length} adresse(s) invalide(s) détectée(s)</summary><ul className="mt-1 max-h-40 space-y-1 overflow-auto text-xs text-muted-foreground">{cleanup.invalid.slice(0, 50).map(row => <li key={row.email}>{row.email} — {row.reasons.join(', ')}</li>)}</ul></details>}
          {cleanup.deleteErrors.length > 0 && <p className="mt-2 flex items-start gap-2 text-xs text-red-700 dark:text-red-300"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{cleanup.deleteErrors.slice(0, 3).join(' · ')}</p>}
        </div>}`,
);
fs.writeFileSync('apps/redaction/src/components/redaction/newsletter-desk.tsx', desk, 'utf8');
console.log('UI', desk.includes('cleanSubscribers') && desk.includes('Nettoyer la liste') ? 'OK' : 'MISS');
