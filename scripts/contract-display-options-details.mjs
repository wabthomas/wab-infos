import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/contract-document.ts';
let text = fs.readFileSync(file, 'utf8');
const eol = text.includes('\r\n') ? '\r\n' : '\n';
const lines = text.split(/\r?\n/);
const detailsBlock = [
  '      show.job !== false || show.location !== false',
  "        ? [show.job !== false ? `Fonction : ${data.jobTitle}` : '', show.location !== false ? `Lieu : ${data.workLocation}` : ''].filter(Boolean).join('   |   ')",
  "        : '',",
  "      show.startDate !== false || (data.kind === 'CDD' && show.endDate !== false)",
  "        ? [show.startDate !== false ? `Prise d'effet : ${displayDate(data.startDate)}` : '', data.kind === 'CDD' && show.endDate !== false ? `Terme : ${displayDate(data.endDate)}` : ''].filter(Boolean).join('   |   ')",
  "        : '',",
  "      show.salary !== false ? `Rémunération déclarée : ${data.salary} ${data.currency}` : '',",
];
let replaced = 0;
for (let i = 0; i < lines.length - 2; i += 1) {
  if (lines[i].includes('`Fonction : ${data.jobTitle}') && lines[i + 2].includes('`Rémunération déclarée :')) {
    lines.splice(i, 3, ...detailsBlock);
    replaced += 1;
    i += detailsBlock.length - 1;
  }
}
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('REPLACED', replaced);
