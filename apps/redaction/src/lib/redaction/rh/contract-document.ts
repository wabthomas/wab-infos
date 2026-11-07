import { jsPDF } from 'jspdf';
import { contractPartyRole, type ContractParties } from './contract-parties';
import { contractRuns, parseContractBlocks, type ContractBlock, type ContractRun } from './contract-format';

export type ContractDocumentData = {
  kind: 'CDD' | 'CDI'; firstName: string; lastName: string; jobTitle: string; workLocation: string;
  startDate: string; endDate?: string | null; salary: string; currency: string; clauses: string;
  employer: { companyName?: string; companyAddress?: string; companyPhone?: string; companyEmail?: string; companyTaxId?: string; companyRegistration?: string; documentHeader?: string; documentFooter?: string; directorName?: string; directorTitle?: string; directorSignatureWidth?: number | string; directorSignatureHeight?: number | string; logoPng?: string | null };
  parties?: ContractParties | null;
  employeeSignature?: string | null; acceptedAt?: string | null; draft?: boolean; draftLabel?: string;
};
export type ContractDocumentAssets = { logo?: string | null; seal?: string | null; signature?: string | null; employeeSignatureImage?: string | null };

type Piece = { text: string; style: ContractRun['style'] };
type TextLine = Piece[];
type Prepared = { block: ContractBlock; marker: string; indent: number; size: number; lineHeight: number; before: number; after: number; lines: TextLine[]; height: number };
const MARGIN = 20, WIDTH = 170, BOTTOM = 266;
const INK = [34, 43, 58] as const;
const MUTED = [91, 103, 122] as const;
const BRAND = [196, 30, 58] as const; // Same crimson as the Rédaction UI.
const BORDER = [217, 222, 229] as const;

function font(doc: jsPDF, style: ContractRun['style']) {
  doc.setFont('helvetica', style === 'bold' ? 'bold' : style === 'italic' ? 'italic' : 'normal');
}
function wrap(doc: jsPDF, text: string, width: number, size: number, heading = false): TextLine[] {
  const lines: TextLine[] = [[]]; let used = 0;
  doc.setFontSize(size);
  for (const source of contractRuns(text)) {
    const run = heading && source.style === 'normal' ? { ...source, style: 'bold' as const } : source;
    for (const token of run.text.match(/\S+|\s+/g) ?? []) {
      const space = /^\s+$/.test(token);
      if (space && used === 0) continue;
      font(doc, run.style);
      const value = space ? ' ' : token;
      const widthOfToken = doc.getTextWidth(value);
      if (!space && used > 0 && used + widthOfToken > width) { lines.push([]); used = 0; }
      if (space && used + widthOfToken > width) continue;
      if (!space && widthOfToken > width) {
        for (const character of value) {
          const charWidth = doc.getTextWidth(character);
          if (used + charWidth > width && used > 0) { lines.push([]); used = 0; }
          lines[lines.length - 1].push({ text: character, style: run.style }); used += charWidth;
        }
      } else { lines[lines.length - 1].push({ text: value, style: run.style }); used += widthOfToken; }
    }
  }
  return lines;
}
function drawLine(doc: jsPDF, pieces: TextLine, x: number, y: number, size: number) {
  doc.setFontSize(size);
  for (const piece of pieces) {
    font(doc, piece.style); doc.text(piece.text, x, y);
    const width = doc.getTextWidth(piece.text);
    if (piece.style === 'underline') { doc.setDrawColor(...BRAND); doc.line(x, y + .55, x + width, y + .55); }
    x += width;
  }
}
function addImage(doc: jsPDF, image: string | null | undefined, x: number, y: number, w: number, h: number) {
  if (!image) return;
  try { doc.addImage(image, 'PNG', x, y, w, h); } catch { /* Invalid optional image: keep the document printable. */ }
}
function addContainedLogo(doc: jsPDF, image: string | null | undefined) {
  if (!image) return;
  try {
    const { width, height } = doc.getImageProperties(image);
    if (!width || !height) return;
    const ratio = Math.min(28 / width, 18 / height);
    doc.addImage(image, 'PNG', 20 + (28 - width * ratio) / 2, 11 + (18 - height * ratio) / 2, width * ratio, height * ratio);
  } catch { /* Older snapshots can have no logo. */ }
}
function singleLine(doc: jsPDF, value: string, x: number, y: number, width: number, minSize: number, align: 'center' | 'left' = 'left') {
  if (!value) return;
  while (doc.getTextWidth(value) > width && doc.getFontSize() > minSize) doc.setFontSize(Math.max(minSize, doc.getFontSize() - .25));
  let line = value;
  while (doc.getTextWidth(line) > width && line.length > 1) line = `${line.slice(0, -2)}…`;
  doc.text(line, x, y, { align });
}
function displayDate(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '—';
  const [year, month, day] = iso.split('-'); return `${day}/${month}/${year}`;
}

/** The browser draft and the server's frozen version share the exact same A4 layout. */
export function buildContractDocument(data: ContractDocumentData, assets: ContractDocumentAssets = {}): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const company = data.employer.companyName || 'Employeur';
  const logo = assets.logo || data.employer.logoPng;
  let y = 0;
  const pageHeader = (first: boolean) => {
    addContainedLogo(doc, logo);
    doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    singleLine(doc, company, logo ? 52 : MARGIN, 18, logo ? 100 : 130, 7.2);
    doc.setTextColor(...MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6);
    const subhead = data.employer.documentHeader || data.employer.companyAddress;
    if (subhead) singleLine(doc, subhead, logo ? 52 : MARGIN, 24, logo ? 110 : 135, 6.2);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND); doc.setFontSize(8);
    doc.text(`CONTRAT ${data.kind}`, 190, 18, { align: 'right' });
    doc.setDrawColor(...BRAND); doc.setLineWidth(.55); doc.line(MARGIN, 31, 190, 31);
    y = first ? 43 : 40;
  };
  const nextPage = () => { doc.addPage(); pageHeader(false); };
  const room = (height: number) => { if (y + height > BOTTOM) nextPage(); };
  pageHeader(true);

  doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text(`CONTRAT DE TRAVAIL À DURÉE ${data.kind === 'CDD' ? 'DÉTERMINÉE' : 'INDÉTERMINÉE'}`, 105, y, { align: 'center', maxWidth: WIDTH });
  y += 5;
  doc.setTextColor(...BRAND); doc.setFontSize(9.4);
  singleLine(doc, data.jobTitle.trim().toLocaleUpperCase('fr') || 'FONCTION À PRÉCISER', 105, y, WIDTH, 7.4, 'center');
  y += 10;
  const details = [
    `Employeur : ${company}`,
    `Collaborateur : ${data.firstName} ${data.lastName}`,
    `Fonction : ${data.jobTitle}   |   Lieu : ${data.workLocation}`,
    `Prise d'effet : ${displayDate(data.startDate)}${data.kind === 'CDD' ? `   |   Terme : ${displayDate(data.endDate)}` : ''}`,
    `Rémunération déclarée : ${data.salary} ${data.currency}`,
  ];
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.3);
  const detailLines = details.flatMap(detail => doc.splitTextToSize(detail, WIDTH - 12) as string[]);
  const detailHeight = 5 + detailLines.length * 4.8;
  room(detailHeight + 7);
  doc.setFillColor(249, 247, 248); doc.rect(MARGIN, y - 4, WIDTH, detailHeight, 'F');
  doc.setFillColor(...BRAND); doc.rect(MARGIN, y - 4, .8, detailHeight, 'F');
  doc.setTextColor(...INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.3);
  for (const line of detailLines) { doc.text(line, MARGIN + 5, y + 1); y += 4.8; }
  y += 9;

  if (data.parties) {
    const party = data.parties;
    const director = `${data.employer.directorName || '—'}, ${data.employer.directorTitle || 'Directeur Général'}`;
    const passages = [
      ['ENTRE LES SOUSSIGNÉS :', true],
      [`${company}${/^(?:world access to business|wab)(?:\b|[- ])/i.test(company.trim()) ? ", exploitant le média WAB-infos TV" : ""}, représenté par ${director}.`, false],
      ['D’UNE PART ;', true],
      [`ET Monsieur/Madame ${data.firstName} ${data.lastName}, ${contractPartyRole(data.jobTitle)}.`, false],
      [`Né(e) à ${party.birthPlace} le ${displayDate(party.birthDate)}.`, false],
      [`Adresse : ${party.address}. Téléphone : ${party.phone}.`, false],
      ['D’AUTRE PART ;', true],
      ['Il a été convenu et arrêté ce qui suit :', false],
    ] as const;
    for (const [text, bold] of passages) {
      doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(9.3);
      const lines = doc.splitTextToSize(text, WIDTH) as string[];
      room(lines.length * 4.8 + (bold ? 3 : 1));
      doc.setTextColor(...INK);
      for (const line of lines) { doc.text(line, MARGIN, y); y += 4.8; }
      y += bold ? 3 : 1;
    }
    y += 3;
  }

  const blocks = parseContractBlocks(data.clauses);
  const prepared: Prepared[] = blocks.map(block => {
    const isHeading = block.kind === 'heading' || block.kind === 'article' || block.kind === 'subheading';
    const isList = block.kind === 'bullet' || block.kind === 'number';
    const indent = isList ? 7 : 0;
    const size = isHeading ? block.kind === 'subheading' ? 9.4 : 10.1 : 9.5;
    const lineHeight = isHeading ? 5.1 : 4.95;
    const before = isHeading ? block.kind === 'subheading' ? 2.4 : 3.8 : block.kind === 'table' ? 2 : 0;
    const after = isHeading ? 2.1 : isList ? 1.1 : block.kind === 'table' ? 3 : 2.1;
    const lines = block.kind === 'table' ? [] : wrap(doc, block.text, WIDTH - indent, size, isHeading);
    const tableRows = block.rows ?? [];
    const height = block.kind === 'table'
      ? before + after + tableRows.reduce((sum, row) => sum + 3 + Math.max(...row.map(cell => wrap(doc, cell, WIDTH / row.length - 7, 8.6).length)) * 4.5, 0)
      : before + lines.length * lineHeight + after;
    return { block, marker: isList ? block.marker ?? '•' : '', indent, size, lineHeight, before, after, lines, height };
  });

  const renderTable = (block: ContractBlock) => {
    const rows = block.rows ?? [];
    if (rows.length < 2) return;
    const widths = rows[0].length === 2 ? [WIDTH * .65, WIDTH * .35] : rows[0].map(() => WIDTH / rows[0].length);
    const headerHeight = 8;
    const header = () => {
      if (y + headerHeight + 9 > BOTTOM) nextPage();
      doc.setFillColor(...BRAND); doc.rect(MARGIN, y, WIDTH, headerHeight, 'F');
      let x = MARGIN;
      rows[0].forEach((cell, i) => {
        doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.4);
        const line = (doc.splitTextToSize(contractRuns(cell).map(run => run.text).join(''), widths[i] - 6) as string[])[0] || '';
        doc.text(line, x + 3, y + 5.3); x += widths[i];
      });
      y += headerHeight;
    };
    // A heading is repeated after a page break; rows never disappear or overlap the footer.
    header();
    rows.slice(1).forEach((row, rowIndex) => {
      const lines = row.map((cell, i) => wrap(doc, cell, widths[i] - 6, 8.6));
      const maximum = Math.max(...lines.map(cell => cell.length));
      let offset = 0;
      while (offset < maximum) {
        const available = Math.floor((BOTTOM - y - 3) / 4.5);
        if (available < 1) { nextPage(); header(); continue; }
        const count = Math.min(maximum - offset, available);
        const height = count * 4.5 + 3;
        doc.setFillColor(rowIndex % 2 ? 249 : 255, rowIndex % 2 ? 247 : 255, rowIndex % 2 ? 248 : 255);
        doc.setDrawColor(...BORDER); doc.setLineWidth(.18);
        doc.rect(MARGIN, y, WIDTH, height, 'FD');
        let x = MARGIN;
        lines.forEach((cellLines, column) => {
          if (column) doc.line(x, y, x, y + height);
          doc.setTextColor(...INK);
          cellLines.slice(offset, offset + count).forEach((line, n) => drawLine(doc, line, x + 3, y + 4.3 + n * 4.5, 8.6));
          x += widths[column];
        });
        y += height; offset += count;
        if (offset < maximum) { nextPage(); header(); }
      }
    });
  };

  prepared.forEach((part, index) => {
    const { block, lines, before, after, indent, lineHeight, size, height } = part;
    const isHeading = block.kind === 'heading' || block.kind === 'article' || block.kind === 'subheading';
    if (isHeading) {
      let groupHeight = 0;
      for (let n = index; n < prepared.length; n++) {
        const entry = prepared[n];
        if (n > index && (entry.block.kind === 'article' || entry.block.kind === 'heading')) break;
        groupHeight += entry.height;
      }
      const following = prepared[index + 1];
      const keepWith = following ? Math.min(following.height, 12) : 0;
      const lastSection = !prepared.slice(index + 1).some(part => part.block.kind === 'article' || part.block.kind === 'heading');
      const tail = lastSection && groupHeight + 64 <= 125 ? groupHeight + 64 : groupHeight;
      room(groupHeight <= 90 || tail > groupHeight ? tail : Math.min(height + keepWith, 70));
    } else if (height <= 65) room(height);
    y += before;
    if (block.kind === 'table') { renderTable(block); y += after; return; }
    lines.forEach((line, lineIndex) => {
      if (y + lineHeight > BOTTOM || (lineIndex < lines.length - 1 && y + 2 * lineHeight > BOTTOM)) nextPage();
      if (lineIndex === 0 && part.marker) {
        doc.setTextColor(...BRAND); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        doc.text(part.marker, MARGIN + 1, y);
      }
      if (block.kind === 'article' || block.kind === 'heading') doc.setTextColor(...BRAND);
      else doc.setTextColor(...INK);
      drawLine(doc, line, MARGIN + indent, y, size);
      y += lineHeight;
    });
    y += after;
  });

  // Signature/date panel is kept together, rather than split onto a nearly empty page.
  room(64); y += 3;
  doc.setDrawColor(...BORDER); doc.setLineWidth(.25);
  doc.setTextColor(...MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.4);
  doc.text('Date de signature : …… / …… / …………', MARGIN, y); y += 5;
  const boxY = y; const boxHeight = 47;
  doc.rect(MARGIN, boxY, WIDTH, boxHeight); doc.line(105, boxY, 105, boxY + boxHeight);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND); doc.setFontSize(8.7);
  doc.text('POUR L’EMPLOYEUR', MARGIN + 3, boxY + 6); doc.text('LE TRAVAILLEUR', 108, boxY + 6);
  const imageY = boxY + 8;
  addImage(doc, assets.seal, MARGIN + 7, imageY, 25, 25);
  addImage(doc, assets.signature, MARGIN + 16, imageY + 1, Math.min(46, Number(data.employer.directorSignatureWidth || 190) / 4), Math.min(22, Number(data.employer.directorSignatureHeight || 92) / 4));
  addImage(doc, assets.employeeSignatureImage, 111, imageY + 1, 53, 21);
  doc.setTextColor(...INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.9);
  doc.text(data.employer.directorName || 'Représentant', MARGIN + 3, boxY + 36, { maxWidth: 79 });
  doc.text(`${data.firstName} ${data.lastName}`, 108, boxY + 36, { maxWidth: 78 });
  doc.setTextColor(...MUTED); doc.setFontSize(8);
  doc.text(data.employer.directorTitle || 'Direction', MARGIN + 3, boxY + 41, { maxWidth: 79 });
  if (data.acceptedAt) doc.text(`Accord visuel du collaborateur : ${new Date(data.acceptedAt).toLocaleDateString('fr-FR')}`, 108, boxY + 41, { maxWidth: 78 });
  else if (data.employeeSignature && !assets.employeeSignatureImage) doc.text(data.employeeSignature, 108, boxY + 41, { maxWidth: 78 });

  const pages = doc.getNumberOfPages();
  for (let number = 1; number <= pages; number++) {
    doc.setPage(number);
    doc.setDrawColor(...BRAND); doc.setLineWidth(.35); doc.line(MARGIN, 276, 190, 276);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MUTED);
    const contact = [company, data.employer.companyPhone, data.employer.companyEmail].filter(Boolean).join('  ·  ');
    singleLine(doc, contact, 105, 282, 153, 5.8, 'center');
    const registration = [data.employer.companyRegistration && `RCCM : ${data.employer.companyRegistration}`, data.employer.companyTaxId && `ID : ${data.employer.companyTaxId}`, data.employer.companyAddress, data.employer.documentFooter].filter(Boolean).join('  ·  ');
    if (registration) singleLine(doc, registration, 103, 286, 133, 5.8, 'center');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.text(`Page ${number} / ${pages}`, 190, 286, { align: 'right' });
    if (data.draft) { doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND); doc.text(data.draftLabel || 'PROJET À RELIRE', 190, 10, { align: 'right' }); }
  }
  return doc;
}
