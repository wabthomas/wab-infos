'use client';

import { saveBlobToAndroid } from '@wab-infos/shared';
import type { OfficialDocumentKind } from './official-documents';
import type { OrganizationSettings } from './organization';

type Assets = Record<'company-logo' | 'document-header' | 'document-footer' | 'director-signature', string | null>;
export type OfficialExport = {
  kind: OfficialDocumentKind; subject: string; body: string; recipient: string;
  date: string; signed: boolean; signatureMode: 'texte' | 'image';
  settings: OrganizationSettings; assets: Assets;
};

const W = 2480, H = 3508, S = 3;
const pageWidth = W / S, pageHeight = H / S;
const left = 72, right = 755;

type Line = { text: string; x: number; y: number; size: number; bold?: boolean; italic?: boolean; align?: CanvasTextAlign };
type Layout = { lines: Line[]; headerBottom: number; footerTop: number; footerImageY: number; signatureY: number | null; fontSize: number };

export class OfficialPageOverflowError extends Error {
  constructor() { super('Le document ne tient pas sur une page A4 lisible. Raccourcissez le corps, le destinataire, l’objet ou l’entête avant de signer, imprimer ou télécharger.'); }
}

function setFont(ctx: CanvasRenderingContext2D, size: number, bold = false, italic = false) {
  ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${size}px Arial`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!paragraph.trim()) { lines.push(''); continue; }
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      if (ctx.measureText(word).width > width) {
        if (line) { lines.push(line); line = ''; }
        let part = '';
        for (const char of word) {
          if (ctx.measureText(part + char).width > width && part) { lines.push(part); part = char; }
          else part += char;
        }
        line = part;
        continue;
      }
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > width && line) { lines.push(line); line = word; }
      else line = next;
    }
    lines.push(line);
  }
  return lines;
}

/** Calcule toutes les positions AVANT de dessiner : aucun contenu ne peut être coupé. */
export function planOfficialPage(ctx: CanvasRenderingContext2D, doc: OfficialExport): Layout {
  const lines: Line[] = [];
  setFont(ctx, 13);
  const headerText = [doc.settings.documentHeader, doc.settings.companyAddress,
    [doc.settings.companyPhone, doc.settings.companyEmail].filter(Boolean).join(' · ')].filter(Boolean).join('\n');
  const headerX = doc.assets['company-logo'] ? 181 : left;
  const headerRight = doc.assets['document-header'] ? 545 : right;
  setFont(ctx, 21, true);
  const nameLines = wrap(ctx, doc.settings.companyName || 'Entreprise', headerRight - headerX);
  setFont(ctx, 13);
  const headerLines = headerText ? wrap(ctx, headerText, headerRight - headerX) : [];
  const detailsY = 65 + 25 * nameLines.length;
  const headerBottom = Math.max(150, detailsY + 17 * headerLines.length + 12);
  if (headerBottom > 250) throw new OfficialPageOverflowError();
  nameLines.forEach((text, i) => lines.push({ text, x: headerX, y: 65 + 25 * i, size: 21, bold: true }));
  headerLines.forEach((text, i) => lines.push({ text, x: headerX, y: detailsY + 17 * i, size: 13 }));

  setFont(ctx, 12);
  const footerLines = doc.settings.documentFooter ? wrap(ctx, doc.settings.documentFooter, right - left) : [];
  const lastFooterBaseline = pageHeight - 42;
  const firstFooterBaseline = lastFooterBaseline - (footerLines.length - 1) * 16;
  const footerImageY = (footerLines.length ? firstFooterBaseline : pageHeight - 40) - (doc.assets['document-footer'] ? 52 : 12);
  const footerTop = footerImageY - 12;
  if (footerTop < pageHeight - 210) throw new OfficialPageOverflowError();
  footerLines.forEach((text, i) => lines.push({ text, x: left, y: firstFooterBaseline + i * 16, size: 12 }));
  lines.push({ text: 'Page 1 / 1', x: right, y: pageHeight - 18, size: 11, align: 'right' });

  // Ajustement modéré de 14 à 11 px ; au-delà, l'utilisateur doit condenser son texte.
  for (const size of [17, 16, 15, 14, 13, 12]) {
    const content: Line[] = [];
    let y = headerBottom + 33;
    function add(text: string, fontSize: number, gap: number, options: { bold?: boolean; align?: CanvasTextAlign } = {}) {
      setFont(ctx, fontSize, options.bold);
      const wrapped = wrap(ctx, text, right - left);
      const step = fontSize * 1.55;
      for (const part of wrapped) {
        content.push({ text: part, x: options.align === 'right' ? right : left, y, size: fontSize, ...options });
        y += step;
      }
      y += gap;
    }
    add(doc.date, 14, 26, { align: 'right' });
    if (doc.kind === 'lettre' && doc.recipient) add(`À l’attention de : ${doc.recipient}`, size, 19);
    add(doc.kind === 'lettre' ? 'LETTRE ADMINISTRATIVE' : 'COMMUNIQUÉ OFFICIEL', 22, 20, { bold: true });
    add(`Objet : ${doc.subject}`, 18, 25, { bold: true });
    add(doc.body, size, 20);
    let signatureY: number | null = null;
    if (doc.signed) {
      setFont(ctx, 14);
      const titles = wrap(ctx, doc.settings.directorTitle || 'Directeur général', 300);
      titles.forEach(text => { content.push({ text, x: right, y, size: 14, align: 'right' }); y += 21; });
      if (doc.signatureMode === 'image') { signatureY = y; y += 77; }
      else {
        setFont(ctx, 22, false, true);
        for (const text of wrap(ctx, doc.settings.directorName, 300)) {
          content.push({ text, x: right, y: y + 26, size: 22, italic: true, align: 'right' }); y += 30;
        }
        y += 14;
      }
      setFont(ctx, 13, true);
      for (const text of wrap(ctx, doc.settings.directorName, 300)) {
        content.push({ text, x: right, y, size: 15, bold: true, align: 'right' }); y += 21;
      }
    }
    if (y <= footerTop - 18) {
      return { lines: [...lines, ...content], headerBottom, footerTop, footerImageY, signatureY, fontSize: size };
    }
  }
  throw new OfficialPageOverflowError();
}

async function load(src: string | null): Promise<HTMLImageElement | null> {
  if (!src?.startsWith('data:image/')) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
function image(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, w: number, h: number) {
  if (!img) return;
  const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);
}

/** Même composition A4 une page pour l'aperçu, l'impression, le PDF et le PNG 300 dpi. */
export async function renderOfficialPage(doc: OfficialExport, scale = S): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(pageWidth * scale); canvas.height = Math.round(pageHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible.');
  ctx.scale(scale, scale);
  const layout = planOfficialPage(ctx, doc);
  const [logo, header, footer, signature] = await Promise.all([
    load(doc.assets['company-logo']), load(doc.assets['document-header']),
    load(doc.assets['document-footer']), load(doc.assets['director-signature']),
  ]);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, pageWidth, pageHeight);
  image(ctx, logo, left, 42, 96, 67);
  image(ctx, header, 560, 28, 195, 80);
  image(ctx, footer, left, layout.footerImageY, 680, 42);
  if (layout.signatureY !== null) {
    if (!signature) throw new Error('Image de signature indisponible.');
    image(ctx, signature, right - 170, layout.signatureY, 170, 70);
  }
  ctx.strokeStyle = '#a4213d'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(left, layout.headerBottom); ctx.lineTo(right, layout.headerBottom); ctx.stroke();
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(left, layout.footerTop); ctx.lineTo(right, layout.footerTop); ctx.stroke();
  for (const item of layout.lines) {
    setFont(ctx, item.size, item.bold, item.italic);
    ctx.fillStyle = item.y >= layout.footerTop ? '#555' : '#222';
    ctx.textAlign = item.align ?? 'left';
    ctx.fillText(item.text, item.x, item.y);
  }
  return canvas;
}

export async function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob && await saveBlobToAndroid(blob, filename, 'image/png')) return;
  const anchor = document.createElement('a'); anchor.href = canvas.toDataURL('image/png'); anchor.download = filename;
  document.body.append(anchor); anchor.click(); anchor.remove();
}

export async function downloadOfficialPdf(page: HTMLCanvasElement, filename: string) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pdf.addImage(page.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  const blob = pdf.output('blob');
  if (await saveBlobToAndroid(blob, filename, 'application/pdf')) return;
  pdf.save(filename);
}
