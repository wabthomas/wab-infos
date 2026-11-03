'use client';

import type { OfficialDocumentKind } from './official-documents';
import type { OrganizationSettings } from './organization';

type Assets = Record<'company-logo' | 'document-header' | 'document-footer' | 'director-signature', string | null>;
export type OfficialExport = {
  kind: OfficialDocumentKind; subject: string; body: string; recipient: string;
  date: string; signed: boolean; signatureMode: 'texte' | 'image';
  settings: OrganizationSettings; assets: Assets;
};

const W = 2480, H = 3508, S = 3;
const contentLeft = 72, contentRight = 755, bottom = 100;

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!paragraph.trim()) { lines.push(''); continue; }
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue;
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

/** Rend chaque page sur un canvas A4 à 300 dpi ; le PDF et les PNG partagent le même rendu. */
export async function renderOfficialPages(doc: OfficialExport): Promise<HTMLCanvasElement[]> {
  const [logo, header, footer, signature] = await Promise.all([
    load(doc.assets['company-logo']), load(doc.assets['document-header']),
    load(doc.assets['document-footer']), load(doc.assets['director-signature']),
  ]);
  const canvases: HTMLCanvasElement[] = [];
  let canvas!: HTMLCanvasElement, ctx!: CanvasRenderingContext2D, y = 0;
  const startPage = () => {
    canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    ctx = canvas.getContext('2d')!; ctx.scale(S, S);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W / S, H / S);
    ctx.fillStyle = '#222';
    image(ctx, logo, contentLeft, 42, 96, 67);
    image(ctx, header, 190, 28, 580, 80);
    ctx.font = 'bold 18px Arial'; ctx.fillText(doc.settings.companyName || 'Entreprise', logo ? 181 : contentLeft, 65);
    ctx.font = '11px Arial';
    for (const [i, line] of wrap(ctx, [doc.settings.documentHeader, doc.settings.companyAddress, [doc.settings.companyPhone, doc.settings.companyEmail].filter(Boolean).join(' · ')].filter(Boolean).join('\n'), 545).slice(0, 5).entries())
      ctx.fillText(line, logo ? 181 : contentLeft, 81 + 14 * i);
    ctx.strokeStyle = '#a4213d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(contentLeft, 145); ctx.lineTo(contentRight, 145); ctx.stroke();
    ctx.font = '10px Arial'; ctx.fillStyle = '#5a5a5a';
    image(ctx, footer, contentLeft, H / S - 80, 680, 42);
    for (const [i, line] of wrap(ctx, doc.settings.documentFooter, 675).slice(0, 2).entries()) ctx.fillText(line, contentLeft, H / S - 41 + 13 * i);
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(contentLeft, H / S - 88); ctx.lineTo(contentRight, H / S - 88); ctx.stroke();
    ctx.fillStyle = '#222'; y = 178; canvases.push(canvas);
  };
  const line = (text: string, options: { size?: number; bold?: boolean; gap?: number; indent?: number } = {}) => {
    const size = options.size ?? 14, step = size * 1.55;
    ctx.font = `${options.bold ? 'bold ' : ''}${size}px Arial`;
    const left = contentLeft + (options.indent || 0);
    for (const part of wrap(ctx, text, contentRight - left)) {
      if (y + step > H / S - bottom) { startPage(); ctx.font = `${options.bold ? 'bold ' : ''}${size}px Arial`; }
      if (part) ctx.fillText(part, left, y);
      y += step;
    }
    y += options.gap ?? 0;
  };
  startPage();
  ctx.textAlign = 'right'; ctx.font = '12px Arial'; ctx.fillText(doc.date, contentRight, y); ctx.textAlign = 'left'; y += 42;
  if (doc.kind === 'lettre' && doc.recipient) line(`À l’attention de : ${doc.recipient}`, { gap: 26 });
  line(doc.kind === 'lettre' ? 'LETTRE ADMINISTRATIVE' : 'COMMUNIQUÉ OFFICIEL', { size: 19, bold: true, gap: 20 });
  line(`Objet : ${doc.subject}`, { size: 15, bold: true, gap: 28 });
  line(doc.body, { size: 14, gap: 28 });
  if (doc.signed) {
    if (y + 155 > H / S - bottom) startPage();
    ctx.textAlign = 'right'; ctx.font = '12px Arial';
    ctx.fillText(doc.settings.directorTitle || 'Directeur général', contentRight, y); y += 20;
    if (doc.signatureMode === 'image' && signature) { image(ctx, signature, contentRight - 170, y, 170, 70); y += 76; }
    else { ctx.font = 'italic 20px Georgia'; ctx.fillText(doc.settings.directorName, contentRight, y + 28); y += 52; }
    ctx.font = 'bold 13px Arial'; ctx.fillText(doc.settings.directorName, contentRight, y);
    ctx.textAlign = 'left';
  }
  canvases.forEach((page, i) => { const context = page.getContext('2d')!; context.setTransform(S, 0, 0, S, 0, 0); context.font = '10px Arial'; context.fillStyle = '#666'; context.textAlign = 'right'; context.fillText(`Page ${i + 1} / ${canvases.length}`, contentRight, H / S - 16); });
  return canvases;
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const anchor = document.createElement('a'); anchor.href = canvas.toDataURL('image/png'); anchor.download = filename;
  document.body.append(anchor); anchor.click(); anchor.remove();
}

export async function downloadOfficialPdf(pages: HTMLCanvasElement[], filename: string) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pages.forEach((page, i) => { if (i) pdf.addPage(); pdf.addImage(page.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297, undefined, 'FAST'); });
  pdf.save(filename);
}
