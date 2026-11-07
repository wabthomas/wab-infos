import fs from 'node:fs';

// --- contract-document.ts : options d'affichage ---
let doc = fs.readFileSync('apps/redaction/src/lib/redaction/rh/contract-document.ts', 'utf8');
doc = doc.replace(
  "  signaturePlace?: string | null; signatureDate?: string | null;",
  "  signaturePlace?: string | null; signatureDate?: string | null;\n  displayOptions?: { job: boolean; location: boolean; startDate: boolean; endDate: boolean; salary: boolean };",
);
doc = doc.replace(
  "  singleLine(doc, data.jobTitle.trim().toLocaleUpperCase('fr') || 'FONCTION À PRÉCISER', 105, y, WIDTH, 7.4, 'center');",
  `  const show = data.displayOptions ?? { job: true, location: true, startDate: true, endDate: true, salary: true };
  if (show.job !== false) singleLine(doc, data.jobTitle.trim().toLocaleUpperCase('fr') || 'FONCTION À PRÉCISER', 105, y, WIDTH, 7.4, 'center');`,
);
doc = doc.replace(
  `    const details = [
      \`Fonction : \${data.jobTitle}   |   Lieu : \${data.workLocation}\`,
      \`Prise d'effet : \${displayDate(data.startDate)}\${data.kind === 'CDD' ? \`   |   Terme : \${displayDate(data.endDate)}\` : ''}\`,
      \`Rémunération déclarée : \${data.salary} \${data.currency}\`,
    ];`,
  `    const details = [
      show.job !== false || show.location !== false
        ? [show.job !== false ? \`Fonction : \${data.jobTitle}\` : '', show.location !== false ? \`Lieu : \${data.workLocation}\` : ''].filter(Boolean).join('   |   ')
        : '',
      show.startDate !== false || (data.kind === 'CDD' && show.endDate !== false)
        ? [show.startDate !== false ? \`Prise d'effet : \${displayDate(data.startDate)}\` : '', data.kind === 'CDD' && show.endDate !== false ? \`Terme : \${displayDate(data.endDate)}\` : ''].filter(Boolean).join('   |   ')
        : '',
      show.salary !== false ? \`Rémunération déclarée : \${data.salary} \${data.currency}\` : '',
    ].filter(Boolean);`,
);
doc = doc.replace(
  `    const details = [
      \`Employeur : \${company}\`,
      \`Collaborateur : \${data.firstName} \${data.lastName}\`,
      \`Fonction : \${data.jobTitle}   |   Lieu : \${data.workLocation}\`,
      \`Prise d'effet : \${displayDate(data.startDate)}\${data.kind === 'CDD' ? \`   |   Terme : \${displayDate(data.endDate)}\` : ''}\`,
      \`Rémunération déclarée : \${data.salary} \${data.currency}\`,
    ];`,
  `    const details = [
      \`Employeur : \${company}\`,
      \`Collaborateur : \${data.firstName} \${data.lastName}\`,
      show.job !== false || show.location !== false
        ? [show.job !== false ? \`Fonction : \${data.jobTitle}\` : '', show.location !== false ? \`Lieu : \${data.workLocation}\` : ''].filter(Boolean).join('   |   ')
        : '',
      show.startDate !== false || (data.kind === 'CDD' && show.endDate !== false)
        ? [show.startDate !== false ? \`Prise d'effet : \${displayDate(data.startDate)}\` : '', data.kind === 'CDD' && show.endDate !== false ? \`Terme : \${displayDate(data.endDate)}\` : ''].filter(Boolean).join('   |   ')
        : '',
      show.salary !== false ? \`Rémunération déclarée : \${data.salary} \${data.currency}\` : '',
    ].filter(Boolean);`,
);
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/contract-document.ts', doc, 'utf8');
console.log('DOCUMENT', doc.includes('show.salary') ? 'OK' : 'MISS');

// --- PDF route : transmettre les options enregistrées ---
let pdf = fs.readFileSync('apps/redaction/src/app/api/redaction/rh/contrats/[id]/pdf/route.ts', 'utf8');
pdf = pdf.replace(
  "parties:row.party_snapshot,employer:row.employer_snapshot",
  "parties:row.party_snapshot,displayOptions:row.display_options ?? undefined,employer:row.employer_snapshot",
);
fs.writeFileSync('apps/redaction/src/app/api/redaction/rh/contrats/[id]/pdf/route.ts', pdf, 'utf8');
console.log('PDF_ROUTE', pdf.includes('displayOptions') ? 'OK' : 'MISS');
