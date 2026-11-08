import fs from 'node:fs';

// Cleanup : shape rows
{
  const file = 'apps/redaction/src/lib/redaction/newsletter-cleanup.ts';
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace('list.subscribers.map', 'list.rows.map');
  fs.writeFileSync(file, text, 'utf8');
  console.log('CLEANUP', text.includes('list.rows.map') ? 'OK' : 'MISS');
}

// UI
const file = 'apps/redaction/src/components/redaction/newsletter-desk.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

for (let i = 0; i < lines.length; i += 1) {
  if (lines[i].includes("from 'lucide-react'")) {
    lines[i] = lines[i].replace('AlertTriangle, Loader2', 'AlertTriangle, Loader2').replace("import { Loader2, Mail, Send, Trash2, Upload, UserMinus } from 'lucide-react';", "import { AlertTriangle, Loader2, Mail, Send, Sparkles, Trash2, Upload, UserMinus } from 'lucide-react';");
    break;
  }
}
let deleting = lines.findIndex(line => line.includes('const [deletingId, setDeletingId]'));
if (deleting >= 0 && !lines.some(line => line.includes('const [cleaning, setCleaning]'))) {
  lines.splice(deleting + 1, 0,
    "  const [cleaning, setCleaning] = useState(false);",
    "  const [cleanup, setCleanup] = useState<{ checked: number; valid: number; deleted: number; duplicates: number; suspicious: Array<{ email: string; reasons: string[] }>; invalid: Array<{ email: string; reasons: string[] }>; deleteErrors: string[] } | null>(null);",
  );
}
const deleteRowIndex = lines.findIndex(line => line.includes('async function deleteRow'));
if (deleteRowIndex >= 0 && !lines.some(line => line.includes('async function cleanSubscribers'))) {
  const handler = [
    '  async function cleanSubscribers() {',
    "    const ok = window.confirm('Analyser toute la liste et supprimer définitivement les adresses invalides (format, doublon, domaine sans messagerie, adresse jetable) ? Les adresses de rôle (info@, contact@…) seront conservées mais envoyées en dernier.');",
    '    if (!ok) return;',
    '    setCleaning(true);',
    '    try {',
    "      const response = await fetchRedaction('/api/redaction/newsletter/subscribers/cleanup', {",
    "        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deleteInvalid: true }),",
    '      });',
    "      const data = await readApiJsonResponse<{ checked: number; valid: number; deleted: number; duplicates: number; suspicious: Array<{ email: string; reasons: string[] }>; invalid: Array<{ email: string; reasons: string[] }>; deleteErrors: string[]; error?: string }>(response);",
    "      if (!response.ok) throw new Error(data.error || 'Nettoyage impossible');",
    '      setCleanup(data);',
    "      toast.success('Nettoyage terminé');",
    '      await loadList(1, query);',
    "    } catch (error) {",
    "      toast.error('Nettoyage', error instanceof Error ? error.message : 'Erreur');",
    '    } finally {',
    '      setCleaning(false);',
    '    }',
    '  }',
    '',
  ];
  // Remplace le toast par un message template valide.
  const toastIndex = handler.findIndex(line => line.includes('toast.success'));
  if (toastIndex >= 0) handler[toastIndex] = "      toast.success('Nettoyage terminé', `${data.deleted} adresse(s) supprimée(s) sur ${data.checked} vérifiée(s).`);";
  lines.splice(deleteRowIndex, 0, ...handler);
}
// Bouton dans l'en-tête
const countLine = lines.findIndex(line => line.includes('actif(s)'));
if (countLine >= 0 && !lines.some(line => line.includes('Nettoyer la liste'))) {
  let close = countLine;
  while (close < lines.length && lines[close].trim() !== '</div>') close += 1;
  lines.splice(close + 1, 0,
    '          <button type="button" onClick={() => void cleanSubscribers()} disabled={cleaning} className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">',
    '            {cleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}',
    '            Nettoyer la liste',
    '          </button>',
  );
}
// Rapport après l'en-tête (avant le premier formulaire de la section)
const reportLine = lines.findIndex(line => line.includes('Nettoyer la liste'));
if (reportLine >= 0 && !lines.some(line => line.includes('Dernier nettoyage'))) {
  let form = reportLine;
  while (form < lines.length && !lines[form].startsWith('        <form')) form += 1;
  const report = [
    '        {cleanup && <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">',
    '          <p className="font-semibold">Dernier nettoyage : {cleanup.checked} vérifiée(s) · {cleanup.valid} valide(s) · {cleanup.deleted} supprimée(s) · {cleanup.duplicates} doublon(s)</p>',
    '          {cleanup.suspicious.length > 0 && <details className="mt-2"><summary className="cursor-pointer font-semibold text-amber-700 dark:text-amber-300">{cleanup.suspicious.length} adresse(s) suspecte(s) conservée(s) — envoyées en dernier</summary><ul className="mt-1 max-h-40 space-y-1 overflow-auto text-xs text-muted-foreground">{cleanup.suspicious.slice(0, 50).map(row => <li key={row.email}>{row.email} — {row.reasons.join(\', \')}</li>)}</ul></details>}',
    '          {cleanup.invalid.length > 0 && <details className="mt-2"><summary className="cursor-pointer font-semibold text-red-700 dark:text-red-300">{cleanup.invalid.length} adresse(s) invalide(s) détectée(s)</summary><ul className="mt-1 max-h-40 space-y-1 overflow-auto text-xs text-muted-foreground">{cleanup.invalid.slice(0, 50).map(row => <li key={row.email}>{row.email} — {row.reasons.join(\', \')}</li>)}</ul></details>}',
    '          {cleanup.deleteErrors.length > 0 && <p className="mt-2 flex items-start gap-2 text-xs text-red-700 dark:text-red-300"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{cleanup.deleteErrors.slice(0, 3).join(\' · \')}</p>}',
    '        </div>}',
  ];
  lines.splice(form, 0, ...report);
}
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('UI', fs.readFileSync(file, 'utf8').includes('Nettoyer la liste') && fs.readFileSync(file, 'utf8').includes('cleanSubscribers') ? 'OK' : 'MISS');
