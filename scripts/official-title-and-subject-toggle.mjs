import fs from 'node:fs';

// 1) Type d'export : titre personnalisable + affichage titre/objet.
let exp = fs.readFileSync('apps/redaction/src/lib/redaction/rh/official-export.ts', 'utf8');
exp = exp.replace(
  "  kind: OfficialDocumentKind; subject: string; body: string; recipient: string;",
  "  kind: OfficialDocumentKind; subject: string; body: string; recipient: string;\n  /** Titre affiché (ex. Lettre Administrative, Recommandation…). */\n  title?: string; showTitle?: boolean; showSubject?: boolean;",
);
exp = exp.replace(
  "    add(doc.kind === 'lettre' ? 'LETTRE ADMINISTRATIVE' : 'COMMUNIQUÉ OFFICIEL', 22, 20, { bold: true });\n    add(`Objet : ${doc.subject}`, 18, 26, { bold: true });",
  `    const heading = doc.title?.trim() || (doc.kind === 'lettre' ? 'LETTRE ADMINISTRATIVE' : 'COMMUNIQUÉ OFFICIEL');
    if (doc.showTitle !== false) add(heading, 22, 20, { bold: true });
    if (doc.showSubject !== false) add(\`Objet : \${doc.subject}\`, 18, 26, { bold: true });`,
);
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/official-export.ts', exp, 'utf8');
console.log('EXPORT', exp.includes('showSubject') && exp.includes('const heading') ? 'OK' : 'MISS');

// 2) Formulaire : champ titre + cases afficher/masquer.
let ui = fs.readFileSync('apps/redaction/src/components/redaction/rh/official-documents.tsx', 'utf8');
ui = ui.replace(
  "  const [kind, setKind] = useState<OfficialDocumentKind>('lettre');",
  "  const [kind, setKind] = useState<OfficialDocumentKind>('lettre');\n  const [documentTitle, setDocumentTitle] = useState('');\n  const [showTitle, setShowTitle] = useState(true);\n  const [showSubject, setShowSubject] = useState(true);",
);
ui = ui.replace(
  "function documentData(): OfficialExport { return { kind, subject: subject.trim(), body: body.trim(), recipient: recipient.trim(), date: date.trim(), signed, signatureMode, settings, assets, verificationUrl: issued?.url, reference: issued?.reference }; }",
  "function documentData(): OfficialExport { return { kind, subject: subject.trim(), body: body.trim(), recipient: recipient.trim(), date: date.trim(), signed, signatureMode, settings, assets, verificationUrl: issued?.url, reference: issued?.reference, title: documentTitle.trim() || undefined, showTitle, showSubject }; }",
);
ui = ui.replace(
  '<label className="mt-3 block text-sm font-medium">Objet<input className={input + \' mt-1\'} maxLength={200} value={subject} onChange={event => edit(\'subject\', event.target.value)} /></label>',
  `<label className="mt-3 block text-sm font-medium">Titre du document
        <input className={input + ' mt-1'} maxLength={80} value={documentTitle} placeholder={kind === 'lettre' ? 'Lettre Administrative' : 'Communiqué Officiel'} onChange={event => { setDocumentTitle(event.target.value); setSigned(false); setIssued(null); }} />
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm font-medium">
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showTitle} onChange={event => { setShowTitle(event.target.checked); setSigned(false); setIssued(null); }} /> Afficher le titre sur le document</label>
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showSubject} onChange={event => { setShowSubject(event.target.checked); setSigned(false); setIssued(null); }} /> Afficher l’objet sur le document</label>
      </div>
      <label className="mt-3 block text-sm font-medium">Objet<input className={input + ' mt-1'} maxLength={200} value={subject} onChange={event => edit('subject', event.target.value)} /></label>`,
);
fs.writeFileSync('apps/redaction/src/components/redaction/rh/official-documents.tsx', ui, 'utf8');
console.log('UI', ui.includes('Titre du document') && ui.includes('showSubject') ? 'OK' : 'MISS');
