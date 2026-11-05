import { jsPDF } from 'jspdf';
import { contractRuns, parseContractBlocks, type ContractBlock, type ContractRun } from './contract-format';

export type ContractDocumentData = {
  kind: 'CDD' | 'CDI'; firstName: string; lastName: string; jobTitle: string; workLocation: string;
  startDate: string; endDate?: string | null; salary: string; currency: string; clauses: string;
  employer: { companyName?: string; companyAddress?: string; documentHeader?: string; documentFooter?: string; directorName?: string; directorTitle?: string; directorSignatureWidth?: number | string; directorSignatureHeight?: number | string };
  employeeSignature?: string | null; acceptedAt?: string | null; draft?: boolean; draftLabel?: string;
};
export type ContractDocumentAssets = { seal?: string | null; signature?: string | null; employeeSignatureImage?: string | null };

type Piece = { text: string; style: ContractRun['style'] };
type TextLine = Piece[];
const MARGIN = 20;
const WIDTH = 170;
const BOTTOM = 267;

function font(doc: jsPDF, style: ContractRun['style']) {
  doc.setFont('helvetica', style === 'bold' ? 'bold' : style === 'italic' ? 'italic' : 'normal');
}

function wrap(doc: jsPDF, text: string, width: number, size: number, heading = false): TextLine[] {
  const lines: TextLine[] = [[]];
  let used = 0;
  doc.setFontSize(size);
  for (const source of contractRuns(text)) {
    const run = heading && source.style === 'normal' ? { ...source, style: 'bold' as const } : source;
    for (const token of run.text.match(/\S+|\s+/g) ?? []) {
      const space = /^\s+$/.test(token);
      if (space && used === 0) continue;
      font(doc, run.style);
      const tokenText = space ? ' ' : token;
      const tokenWidth = doc.getTextWidth(tokenText);
      if (!space && used > 0 && used + tokenWidth > width) { lines.push([]); used = 0; }
      if (space && used + tokenWidth > width) continue;
      // Unbroken URLs or words must not escape the printable area.
      if (!space && tokenWidth > width) {
        for (const character of tokenText) {
          const charWidth = doc.getTextWidth(character);
          if (used + charWidth > width && used > 0) { lines.push([]); used = 0; }
          lines[lines.length - 1].push({ text: character, style: run.style });
          used += charWidth;
        }
      } else {
        lines[lines.length - 1].push({ text: tokenText, style: run.style });
        used += tokenWidth;
      }
    }
  }
  return lines;
}

function drawLine(doc: jsPDF, pieces: TextLine, x: number, y: number, size: number) {
  doc.setFontSize(size);
  for (const piece of pieces) {
    font(doc, piece.style);
    doc.text(piece.text, x, y);
    const width = doc.getTextWidth(piece.text);
    if (piece.style === 'underline') doc.line(x, y + 0.55, x + width, y + 0.55);
    x += width;
  }
}

function addImage(doc: jsPDF, image: string | null | undefined, x: number, y: number, w: number, h: number) {
  if (!image) return;
  try { doc.addImage(image, 'PNG', x, y, w, h); } catch { /* Invalid optional image: keep the document printable. */ }
}

/** Shared A4 composition for the browser draft and the server's frozen version. */
export function buildContractDocument(data: ContractDocumentData, assets: ContractDocumentAssets = {}): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  let y = 19;
  const nextPage = () => {
    doc.addPage(); y = 20;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(`CONTRAT DE TRAVAIL ${data.kind} — SUITE`, MARGIN, y);
    doc.setDrawColor(170); doc.line(MARGIN, y + 3, 190, y + 3);
    y = 34;
  };
  const room = (height: number) => { if (y + height > BOTTOM) nextPage(); };

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text(data.employer.companyName || 'Employeur', 105, y, { align: 'center' });
  y += 5;
  const header = [data.employer.companyAddress, data.employer.documentHeader].filter(Boolean).join(' · ');
  if (header) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(header, 105, y, { align: 'center', maxWidth: WIDTH }); y += 6; }
  else y += 6;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text(`CONTRAT DE TRAVAIL À DURÉE ${data.kind === 'CDD' ? 'DÉTERMINÉE' : 'INDÉTERMINÉE'}`, 105, y, { align: 'center' });
  y += 4;
  doc.setDrawColor(70, 82, 99); doc.line(31, y, 179, y);
  y += 9;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  const details = [
    `Employeur : ${data.employer.companyName || '—'}`, 
    `Travailleur : ${data.firstName} ${data.lastName}`,
    `Fonction : ${data.jobTitle}   |   Lieu : ${data.workLocation}`,
    `Prise d'effet : ${data.startDate}${data.kind === 'CDD' && data.endDate ? `   |   Terme : ${data.endDate}` : ''}`,
    `Rémunération : ${data.salary} ${data.currency}`,
  ];
  for (const detail of details) {
    for (const line of doc.splitTextToSize(detail, WIDTH) as string[]) {
      room(5.2); doc.text(line, MARGIN, y); y += 5.2;
    }
  }
  y += 5;
  doc.setDrawColor(205); doc.line(MARGIN, y - 2, 190, y - 2);

  const blocks = parseContractBlocks(data.clauses);
  const prepared = blocks.map((block: ContractBlock) => {
    const isHeading = block.kind === 'heading' || block.kind === 'article';
    const isList = block.kind === 'bullet' || block.kind === 'number';
    const marker = isList ? block.marker ?? '•' : '';
    const indent = isList ? 7 : 0;
    const size = isHeading ? 10.5 : 10;
    const lineHeight = isHeading ? 5.6 : 5.15;
    const before = isHeading ? 3.5 : 0;
    const after = isHeading ? 2.4 : isList ? 1.2 : 2.6;
    return { block, marker, indent, size, lineHeight, before, after, lines: wrap(doc, block.text, WIDTH - indent, size, isHeading) };
  });
  prepared.forEach((part, index) => {
    const { block, lines, before, after, indent, lineHeight, size } = part;
    // Keep headings with the beginning of their article, and short blocks on one page.
    const following = prepared[index + 1];
    const withNext = block.kind === 'heading' || block.kind === 'article'
      ? Math.min(2, following?.lines.length ?? 0) * (following?.lineHeight ?? 0) + (following?.before ?? 0) + 2
      : 0;
    const total = before + lines.length * lineHeight + after;
    if (block.kind === 'heading' || block.kind === 'article') {
      let groupHeight = 0;
      for (let followingIndex = index; followingIndex < prepared.length; followingIndex++) {
        const entry = prepared[followingIndex];
        if (followingIndex > index && (entry.block.kind === 'heading' || entry.block.kind === 'article')) break;
        groupHeight += entry.before + entry.lines.length * entry.lineHeight + entry.after;
      }
      room(groupHeight <= 95 ? groupHeight : Math.min(total, 65) + withNext);
    } else if (total <= 65) room(total);
    y += before;
    lines.forEach((line, lineIndex) => {
      // Do not leave a single line of a paragraph at the bottom of a page.
      if (y + lineHeight > BOTTOM || (lineIndex < lines.length - 1 && y + 2 * lineHeight > BOTTOM)) nextPage();
      if (lineIndex === 0 && part.marker) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(part.marker, MARGIN + 1, y);
      }
      drawLine(doc, line, MARGIN + indent, y, size);
      y += lineHeight;
    });
    y += after;
  });

  // Reserve the complete signatures area as one indivisible block.
  room(60);
  y += 4;
  doc.setDrawColor(145); doc.line(MARGIN, y, 190, y);
  y += 6;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
  doc.text('POUR L’EMPLOYEUR', MARGIN, y);
  doc.text('LE TRAVAILLEUR', 112, y);
  const imageY = y + 3;
  addImage(doc, assets.seal, MARGIN + 5, imageY, 26, 26);
  addImage(doc, assets.signature, MARGIN + 14, imageY + 1, Math.min(48, Number(data.employer.directorSignatureWidth || 190) / 4), Math.min(23, Number(data.employer.directorSignatureHeight || 92) / 4));
  addImage(doc, assets.employeeSignatureImage, 114, imageY + 1, 53, 22);
  y = imageY + 30;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  doc.text(data.employer.directorName || 'Représentant', MARGIN, y);
  doc.text(`${data.firstName} ${data.lastName}`, 112, y);
  y += 5;
  doc.text(data.employer.directorTitle || 'Direction', MARGIN, y);
  if (data.employeeSignature && !assets.employeeSignatureImage) doc.text(data.employeeSignature, 112, y);
  if (data.acceptedAt) {
    y += 5; doc.setFontSize(8);
    doc.text(`Acceptation enregistrée le ${new Date(data.acceptedAt).toLocaleDateString('fr-FR')}`, 112, y);
  }

  const count = doc.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    doc.setPage(page); doc.setDrawColor(210); doc.line(MARGIN, 277, 190, 277);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(95);
    doc.text(data.employer.documentFooter || `${data.employer.companyName || 'Employeur'} · Contrat ${data.kind}`, MARGIN, 283, { maxWidth: 140 });
    doc.text(`Page ${page} / ${count}`, 190, 283, { align: 'right' });
    if (data.draft) { doc.setFont('helvetica', 'bold'); doc.setTextColor(158, 38, 70); doc.text(data.draftLabel || 'PROJET À RELIRE', 190, 11, { align: 'right' }); }
  }
  return doc;
}
