import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/contracts-workspace.tsx';
let text = fs.readFileSync(file, 'utf8');

// Icônes
text = text.replace(
  "import Link from 'next/link';",
  "import Link from 'next/link';\nimport { Archive, CheckCircle2, Clock3, Download, Eye, EyeOff, FilePlus2, FileText, PenLine, Plus, Save, Send, ShieldCheck, Sparkles, Users } from 'lucide-react';",
);

// États dérivés + recherche
text = text.replace(
  "  const [activeTab, setActiveTab] = useState<'gestion'|'redaction'|'configuration'>('gestion');",
  `  const [activeTab, setActiveTab] = useState<'gestion'|'redaction'|'configuration'>('gestion');
  const [contractQuery, setContractQuery] = useState('');`,
);
text = text.replace(
  "  return <div className=\"space-y-5 rounded-2xl border border-border bg-card p-4 sm:p-7\">",
  `  const visibleCases = cases.filter(item => \`\${item.firstName} \${item.lastName} \${item.kind} \${item.jobTitle}\`.toLowerCase().includes(contractQuery.trim().toLowerCase()));
  const stats = {
    draft: cases.filter(item => item.status === 'draft').length,
    pending: cases.filter(item => item.status === 'proposed' || item.status === 'pending_approval').length,
    accepted: cases.filter(item => item.status === 'accepted').length,
    declined: cases.filter(item => item.status === 'declined').length,
  };
  return <div className="space-y-5 rounded-2xl border border-border bg-card p-4 sm:p-7">`,
);

// En-tête + statistiques + onglets
const oldHeader = text.match(/    <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">[\s\S]*?<\/nav>/);
if (oldHeader) {
  text = text.replace(
    oldHeader[0],
    `    <header className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.10] via-card to-card">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><FileText className="h-6 w-6" /></span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Contrats RH · RDC</p>
            <h2 className="mt-1 font-display text-2xl font-bold">Contrat CDD / CDI</h2>
            <p className="mt-1 text-sm text-muted-foreground">Préparez, transmettez et suivez les contrats de l'équipe.</p>
          </div>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-90" onClick={() => newCase()}><FilePlus2 className="h-4 w-4" /> Nouveau contrat</button>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-primary/10 bg-primary/10 sm:grid-cols-4">
        {([
          ['Brouillons', stats.draft, 'bg-amber-500/10 text-amber-700 dark:text-amber-300'],
          ['En cours', stats.pending, 'bg-sky-500/10 text-sky-700 dark:text-sky-300'],
          ['Approuvés', stats.accepted, 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'],
          ['Refusés', stats.declined, 'bg-rose-500/10 text-rose-700 dark:text-rose-300'],
        ] as const).map(([label, value]) => (
          <div key={label} className="bg-card px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-0.5 font-display text-xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
    </header>
    <nav aria-label="Sections des contrats" className="flex flex-wrap gap-2">
      {([
        ['gestion', 'Gestion', Users],
        ['redaction', 'Rédaction', PenLine],
        ['configuration', 'Configuration', Sparkles],
      ] as const).map(([key, label, Icon]) => (
        <button key={key} type="button" aria-current={activeTab === key ? 'page' : undefined} onClick={() => setActiveTab(key)} className={\`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors \${activeTab === key ? 'bg-primary text-primary-foreground shadow-sm' : 'border border-border bg-card hover:bg-muted'}\`}>
          <Icon className="h-4 w-4" /> {label}
        </button>
      ))}
    </nav>`,
  );
}

// Sections avec icônes
text = text.replace(
  '<h3 className="mb-4 text-base font-bold">01 · Informations du contrat</h3>',
  '<div className="mb-4 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-4 w-4" /></span><h3 className="text-base font-bold">01 · Informations du contrat</h3></div>',
);
text = text.replace(
  '<h3 className="text-base font-bold">02 · Corps du contrat</h3>',
  '<div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><PenLine className="h-4 w-4" /></span><h3 className="text-base font-bold">02 · Corps du contrat</h3></div>',
);
text = text.replace(
  '<h3 className="text-base font-bold">03 · Validation et visa</h3>',
  '<div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="h-4 w-4" /></span><h3 className="text-base font-bold">03 · Validation et visa</h3></div>',
);

// Boutons d'action avec icônes
text = text.replace(
  "onClick={()=>void saveDraft()} className=\"rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50\">",
  "onClick={()=>void saveDraft()} className=\"inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50\"><Save className=\"h-4 w-4\" />",
);
text = text.replace(
  "onClick={()=>void proposeCase()} className=\"rounded-xl border border-primary px-4 py-2.5 text-sm font-bold text-primary disabled:opacity-50\">",
  "onClick={()=>void proposeCase()} className=\"inline-flex items-center gap-2 rounded-xl border border-primary px-4 py-2.5 text-sm font-bold text-primary disabled:opacity-50\"><Send className=\"h-4 w-4\" />",
);
text = text.replace(
  "onClick={() => void exportPdf()} className=\"rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-50\">",
  "onClick={() => void exportPdf()} className=\"inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-50\"><Download className=\"h-4 w-4\" />",
);
text = text.replace(
  "onClick={()=>void archiveCase()} className=\"rounded-xl border px-4 py-2.5 text-sm text-red-600 disabled:opacity-50\">",
  "onClick={()=>void archiveCase()} className=\"inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm text-red-600 disabled:opacity-50\"><Archive className=\"h-4 w-4\" />",
);

// Aperçu : bouton avec icône
text = text.replace(
  "className=\"rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted\">{showPreview?'Masquer l’aperçu du contrat':'Afficher l’aperçu du contrat A4'}</button>",
  "className=\"inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted\">{showPreview ? <EyeOff className=\"h-4 w-4\" /> : <Eye className=\"h-4 w-4\" />}{showPreview?'Masquer l’aperçu du contrat':'Afficher l’aperçu du contrat A4'}</button>",
);

fs.writeFileSync(file, text, 'utf8');
console.log('BASE_UI', text.includes('visibleCases') && text.includes('contractQuery') ? 'OK' : 'MISS');
