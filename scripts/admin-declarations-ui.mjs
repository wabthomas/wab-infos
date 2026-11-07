import fs from 'node:fs';

// --- Route API : POST admin ---
let route = fs.readFileSync('apps/redaction/src/app/api/redaction/rh/declarations/route.ts', 'utf8');
route = route.replace(
  "import { validateSubmissionDecision } from '@/lib/redaction/rh/submissions';",
  "import { validateSubmissionDecision, validateAdminSubmission } from '@/lib/redaction/rh/submissions';\nimport { kinshasaToday } from '@/lib/redaction/rh/activities';",
);
route = route.replace(
  "import { listSubmissions, decideSubmission } from '@/lib/redaction/rh/database';",
  "import { listSubmissions, decideSubmission, createAdminSubmission } from '@/lib/redaction/rh/database';",
);
if (!route.includes('createAdminSubmission(')) {
  route += `
export async function POST(request: Request) {
  try {
    const user = await requireRhPermission('hr_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown; try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const input = validateAdminSubmission(body, kinshasaToday());
    if (!input) return json({ error: 'Vérifiez le collaborateur, la date et la description (500 caractères maximum).' }, 400);
    const submission = await createAdminSubmission(user.email, input);
    if (!submission) return json({ error: 'Une déclaration existe déjà pour cette journée, ou le collaborateur est archivé.' }, 409);
    return json({ submission }, 201);
  } catch (error) { return handleError(error); }
}
`;
}
fs.writeFileSync('apps/redaction/src/app/api/redaction/rh/declarations/route.ts', route, 'utf8');
console.log('ROUTE', route.includes('createAdminSubmission') ? 'OK' : 'MISS');

// --- Page : passer la date du jour ---
let page = fs.readFileSync('apps/redaction/src/app/(editor)/rh/prestations/page.tsx', 'utf8');
page = page.replace('<SubmissionReview youtubeEnabled={youtubePerformanceEnabled()} />', '<SubmissionReview today={today} youtubeEnabled={youtubePerformanceEnabled()} />');
fs.writeFileSync('apps/redaction/src/app/(editor)/rh/prestations/page.tsx', page, 'utf8');
console.log('PAGE', page.includes('today={today}') ? 'OK' : 'MISS');

// --- Formulaire admin + badges dans la revue ---
let ui = fs.readFileSync('apps/redaction/src/components/redaction/rh/submission-review.tsx', 'utf8');
ui = ui.replace('export function SubmissionReview({ youtubeEnabled = false }: { youtubeEnabled?: boolean }) {', "export function SubmissionReview({ today = '', youtubeEnabled = false }: { today?: string; youtubeEnabled?: boolean }) {");
ui = ui.replace(
  "  const [loading, setLoading] = useState(false);",
  "  const [adminDate, setAdminDate] = useState(today), [adminDescription, setAdminDescription] = useState(''), [adminBusy, setAdminBusy] = useState(false), [adminOpen, setAdminOpen] = useState(false);\n  const [loading, setLoading] = useState(false);",
);
if (!ui.includes('declareForCollaborator')) {
  ui = ui.replace(
    "  async function decide(item: Submission, decision: 'approve' | 'reject') {",
    `  async function declareForCollaborator(event: React.FormEvent) {
    event.preventDefault();
    if (!personId || !adminDescription.trim()) return;
    setAdminBusy(true); setError(''); setMessage('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/declarations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaboratorId: personId, date: adminDate, description: adminDescription }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Déclaration impossible.');
      setAdminDescription(''); setAdminOpen(false);
      setMessage('Prestation déclarée par l’administration et validée d’office.');
      setReload(n => n + 1); window.dispatchEvent(new Event('rh-submissions-changed'));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Déclaration impossible.'); }
    finally { setAdminBusy(false); }
  }
  async function decide(item: Submission, decision: 'approve' | 'reject') {`,
  );
  ui = ui.replace(
    "    {personId && (loading ?",
    `    {personId && <div className="rounded-lg border border-dashed border-primary/40 bg-primary/[0.03] p-3">
      <button type="button" onClick={() => setAdminOpen(open => !open)} aria-expanded={adminOpen} className="text-sm font-semibold text-primary">+ Déclarer une prestation pour ce collaborateur (oubli)</button>
      {adminOpen && <form onSubmit={declareForCollaborator} className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr_auto]">
        <label className="block text-sm font-medium">Date<input type="date" required max={today || undefined} value={adminDate} onChange={event => setAdminDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
        <label className="block text-sm font-medium">Activités réalisées<input required maxLength={500} value={adminDescription} onChange={event => setAdminDescription(event.target.value)} placeholder="Décrivez la prestation constatée" className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
        <button type="submit" disabled={adminBusy} className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{adminBusy ? 'Enregistrement…' : 'Déclarer et valider'}</button>
      </form>}
      {adminOpen && <p className="mt-2 text-xs text-muted-foreground">La déclaration portera la mention « Saisie par l’administration » et sera validée d’office dans l’historique du collaborateur.</p>}
    </div>}
    {personId && (loading ?`,
  );
  ui = ui.replace(
    "<p className=\"font-semibold\">{item.date} Â· {labels[item.status]}</p>",
    "<p className=\"flex flex-wrap items-center gap-2 font-semibold\">{item.date} Â· {labels[item.status]}{item.source === 'admin' && <span className=\"rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300\">Saisie administration</span>}</p>",
  );
}
fs.writeFileSync('apps/redaction/src/components/redaction/rh/submission-review.tsx', ui, 'utf8');
console.log('UI', ui.includes('declareForCollaborator') ? 'OK' : 'MISS');

// --- Badge côté collaborateur ---
let mine = fs.readFileSync('apps/redaction/src/components/redaction/rh/my-submissions.tsx', 'utf8');
if (!mine.includes('Saisie administration')) {
  mine = mine.replace(
    '{item.decisionNote && <p className="mt-1">Motif : {item.decisionNote}</p>}',
    '{item.source === \'admin\' && <p className="mt-1 inline-flex rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">Saisie par l’administration</p>}\n        {item.decisionNote && <p className="mt-1">Motif : {item.decisionNote}</p>}',
  );
}
fs.writeFileSync('apps/redaction/src/components/redaction/rh/my-submissions.tsx', mine, 'utf8');
console.log('MINE', mine.includes('Saisie par l’administration') ? 'OK' : 'MISS');
