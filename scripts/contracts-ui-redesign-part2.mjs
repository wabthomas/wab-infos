import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/contracts-workspace.tsx';
let text = fs.readFileSync(file, 'utf8');

// Helper tonalité statut.
if (!text.includes('const statusTone')) {
  text = text.replace(
    '  const visibleCases = cases.filter',
    `  const statusTone = (status: ContractCase['status']) => status === 'accepted'
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    : status === 'declined'
      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
      : status === 'draft'
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : 'bg-sky-500/10 text-sky-700 dark:text-sky-300';
  const visibleCases = cases.filter`,
  );
}

const lines = text.split(/\r?\n/);
const start = lines.findIndex(line => line.includes('Dossiers enregistr'));
if (start < 0) { console.log('MISS start'); process.exit(0); }
let end = start;
while (end < lines.length && !lines[end].includes('</section>}')) end += 1;

const block = `        {activeTab==='gestion'&&<section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 p-4 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users className="h-4 w-4" /></span>
              <h3 className="font-bold">Dossiers de contrats</h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">{cases.length}</span>
            </div>
            <input value={contractQuery} onChange={event => setContractQuery(event.target.value)} placeholder="Rechercher un collaborateur, un type…" aria-label="Rechercher un contrat" className="min-h-9 w-full max-w-xs rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Collaborateur</th>
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                  <th className="px-4 py-2.5 font-semibold">Période</th>
                  <th className="px-4 py-2.5 font-semibold">Statut</th>
                  <th className="px-4 py-2.5 font-semibold">Version</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleCases.map(item => {
                  const progress = contractProgress(item.status, item.kind, item.startDate, item.endDate);
                  return <tr key={item.id} onClick={() => choose(item)} className={\`cursor-pointer transition-colors \${selected?.id === item.id ? 'bg-primary/[0.07]' : 'hover:bg-muted/40'}\`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{item.firstName} {item.lastName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.jobTitle}</p>
                    </td>
                    <td className="px-4 py-3"><span className="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-bold">{item.kind}</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{item.startDate}{item.kind === 'CDD' && item.endDate ? \` → \${item.endDate}\` : ''}</td>
                    <td className="px-4 py-3">
                      <span className={\`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold \${statusTone(item.status)}\`}>
                        {item.status === 'accepted' ? <CheckCircle2 className="h-3 w-3" /> : item.status === 'draft' ? <FileText className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                        {item.status === 'accepted' && !item.approvedAt ? 'Accord historique' : progress.label}
                      </span>
                      {progress.reminder && <p className="mt-1 max-w-52 text-[11px] font-semibold text-amber-700 dark:text-amber-300">{progress.reminder}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">v{item.version}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={event => { event.stopPropagation(); choose(item); setActiveTab(item.status === 'draft' ? 'redaction' : 'gestion'); }} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">
                        <PenLine className="h-3.5 w-3.5" /> {item.status === 'draft' ? 'Modifier' : 'Ouvrir'}
                      </button>
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          {!cases.length&&<p className="p-5 text-sm text-muted-foreground">Aucun dossier de contrat pour le moment.</p>}
          {cases.length>0&&!visibleCases.length&&<p className="p-5 text-sm text-muted-foreground">Aucun contrat ne correspond à cette recherche.</p>}
          {selected&&<div className="flex flex-wrap items-center gap-2 border-t bg-muted/20 p-4">
            <button type="button" onClick={()=>setActiveTab('redaction')} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><PenLine className="h-4 w-4" />{selected.status==='draft'?'Modifier le brouillon':'Consulter le contrat'}</button>
            {selected.status==='pending_approval'&&<button type="button" disabled={busy} onClick={()=>void approveCase()} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Approuver le contrat signé</button>}
            <Link href="/rh/documents" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary underline">Documents RH</Link>
          </div>}
        </section>}`;

lines.splice(start, end - start + 1, ...block.split('\n'));
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('TABLE', fs.readFileSync(file, 'utf8').includes('Dossiers de contrats') ? 'OK' : 'MISS');
