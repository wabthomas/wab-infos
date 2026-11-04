'use client';

import type { OrganizationSettings } from './organization';

export type IdFieldGroup = { title: string; fields: { label: string; value: string | null | undefined }[] };
export type IdPage = {
  firstName: string; lastName: string; groups: IdFieldGroup[]; company: OrganizationSettings;
  photo: string; seal: string; signature: string; qr: string;
  assets: Record<string, string | null>;
};

type Line = { text: string; x: number; y: number; size: number; color: string; bold?: boolean; align?: CanvasTextAlign };
type Box = { x: number; y: number; width: number; height: number; color: string };
export type IdLayout = { lines: Line[]; boxes: Box[]; signatureY: number; footerY: number; headerBottom: number };
const WIDTH = 2480 / 3, HEIGHT = 3508 / 3;
const LEFT = 62, RIGHT = WIDTH - 62;

export class IdPageOverflowError extends Error {
  constructor() { super('La fiche ne tient pas lisiblement sur une seule page A4. Raccourcissez les champs trop longs ou l’en-tête/le pied de page dans les paramètres RH ; aucun contenu ne sera coupé.'); }
}

function font(ctx: CanvasRenderingContext2D, size: number, bold = false) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px Arial`;
}
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const result: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!paragraph.trim()) { result.push(''); continue; }
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      let part = '';
      for (const char of word) {
        if (ctx.measureText(part + char).width > maxWidth && part) {
          if (line) { result.push(line); line = ''; }
          result.push(part); part = char;
        } else part += char;
      }
      const next = line ? `${line} ${part}` : part;
      if (ctx.measureText(next).width > maxWidth && line) { result.push(line); line = part; }
      else line = next;
    }
    result.push(line);
  }
  return result;
}

/** Layout calculé entièrement avant tout rendu : jamais de page supplémentaire ni de valeur tronquée. */
export function planEmployeeIdPage(ctx: CanvasRenderingContext2D, data: IdPage): IdLayout {
  const lines: Line[] = [], boxes: Box[] = [];
  const add = (text: string, x: number, y: number, size: number, bold = false, color = '#232733', align?: CanvasTextAlign) => lines.push({ text, x, y, size, bold, color, align });
  const headerX = data.assets['document-header'] ? LEFT : LEFT + 78;
  const headerWidth = RIGHT - headerX - 116; // réserver la photo
  let hy = 52;
  font(ctx, 20, true);
  for (const part of wrap(ctx, data.company.companyName || 'Entreprise', headerWidth)) { add(part,headerX,hy,20,true); hy += 26; }
  font(ctx, 12);
  const header = [data.company.documentHeader || 'Document interne · ressources humaines', data.company.companyAddress,
    [data.company.companyPhone,data.company.companyEmail].filter(Boolean).join(' · ')].filter(Boolean).join('\n');
  for (const part of wrap(ctx,header,headerWidth)) { add(part,headerX,hy,12,false,'#535964'); hy += 17; }
  const headerBottom = Math.max(174,hy + 52);
  if (headerBottom > 258) throw new IdPageOverflowError();
  add('FICHE D’IDENTIFICATION',LEFT,headerBottom-26,23,true);
  const footerY = HEIGHT - 96;
  const footer = data.company.documentFooter || 'Document interne · Ressources humaines';
  font(ctx,12);
  const footerOffset = data.assets['document-footer'] ? 105 : 0;
  const footerLines = wrap(ctx,footer,RIGHT-LEFT-footerOffset);
  if (footerLines.length > 3) throw new IdPageOverflowError();
  footerLines.forEach((part,i) => add(part,LEFT+footerOffset,footerY+27+i*15,12,false,'#535964'));
  add('Page 1 / 1',RIGHT,HEIGHT-21,11,false,'#535964','right');
  let y = headerBottom + 14;
  const gap = 12, colWidth = (RIGHT - LEFT - gap*2)/3;
  for (const group of data.groups) {
    boxes.push({ x:LEFT,y,width:RIGHT-LEFT,height:29,color:'#f1f2f5' });
    add(group.title.toLocaleUpperCase('fr'),LEFT+10,y+20,13,true);
    y += 37;
    for (let index=0; index<group.fields.length; index+=3) {
      const row = group.fields.slice(index,index+3);
      const content = row.map(field => {
        font(ctx,10,true); const label = wrap(ctx,field.label.toLocaleUpperCase('fr'),colWidth-18);
        font(ctx,15,true); const value = wrap(ctx,field.value || '—',colWidth-18);
        return {label,value};
      });
      const height = Math.max(51,...content.map(field => 12 + field.label.length*13 + 5 + field.value.length*20 + 10));
      for (let column=0; column<row.length; column++) {
        const x = LEFT + column*(colWidth+gap);
        boxes.push({x,y,width:colWidth,height,color:'#f8f8fa'});
        let ly=y+17;
        for (const part of content[column].label) { add(part,x+9,ly,10,true,'#5e636f'); ly+=13; }
        ly+=5;
        for (const part of content[column].value) { add(part,x+9,ly,15,true); ly+=20; }
      }
      y += height+8;
    }
    y += 13;
  }
  const signatureY = Math.max(y+16,HEIGHT-289);
  font(ctx,17,true);
  if (wrap(ctx,data.signature,165).length > 2 || signatureY+169 > footerY-10) throw new IdPageOverflowError();
  add('SIGNATURE DU COLLABORATEUR',LEFT,signatureY+33,11,true,'#535964');
  add('VALIDATION RH',RIGHT,signatureY+33,11,true,'#535964','right');
  font(ctx,17,true);
  wrap(ctx,data.signature,165).forEach((part,i) => add(part,WIDTH/2,signatureY+91+i*20,17,true,'#233d78','center'));
  if (data.qr) add('Identité entreprise · pas une preuve d’authenticité',RIGHT,signatureY+158,10,false,'#535964','right');
  return {lines,boxes,signatureY,footerY,headerBottom};
}

async function load(src: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!src || (!src.startsWith('data:image/') && !src.startsWith('/'))) return null;
  return new Promise(resolve => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => resolve(null); image.src = src;
  });
}
function drawImage(ctx:CanvasRenderingContext2D,image:HTMLImageElement|null,x:number,y:number,w:number,h:number) {
  if(!image)return;
  const ratio=Math.min(w/image.naturalWidth,h/image.naturalHeight);
  ctx.drawImage(image,x+(w-image.naturalWidth*ratio)/2,y+(h-image.naturalHeight*ratio)/2,image.naturalWidth*ratio,image.naturalHeight*ratio);
}

/** La même image est montrée, imprimée et exportée en PDF/PNG A4. */
export async function renderEmployeeIdPage(data:IdPage, scale=3):Promise<HTMLCanvasElement> {
  const canvas=document.createElement('canvas');canvas.width=Math.round(WIDTH*scale);canvas.height=Math.round(HEIGHT*scale);
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas indisponible.');
  ctx.scale(scale,scale);
  const layout=planEmployeeIdPage(ctx,data);
  const [logo,header,photo,seal,footer,qr]=await Promise.all([
    load(data.assets['company-logo']||'/logo.png'),load(data.assets['document-header']),load(data.photo),load(data.seal),load(data.assets['document-footer']),load(data.qr),
  ]);
  if(data.photo && !photo)throw new Error('La photo du collaborateur est illisible.');
  if(data.seal && !seal)throw new Error('Le sceau RH est illisible.');
  if(data.qr && !qr)throw new Error('Le QR d’identité de l’entreprise est illisible.');
  if(data.assets['company-logo'] && !logo && !header)throw new Error('Le logo de l’entreprise est illisible.');
  if(data.assets['document-header'] && !header)throw new Error('Le visuel d’en-tête est illisible.');
  if(data.assets['document-footer'] && !footer)throw new Error('Le visuel de pied de page est illisible.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.fillStyle='#191923';ctx.fillRect(0,0,WIDTH,5);
  drawImage(ctx,header,62,15,500,27);
  if(!header)drawImage(ctx,logo,LEFT,30,65,58);
  ctx.strokeStyle='#d2d4db';ctx.strokeRect(RIGHT-100,30,100,116);
  if(photo)drawImage(ctx,photo,RIGHT-98,32,96,112);
  else {font(ctx,24,true);ctx.fillStyle='#9497a1';ctx.textAlign='center';ctx.fillText(`${data.firstName[0]||''}${data.lastName[0]||''}`,RIGHT-50,95);}
  ctx.fillStyle='#a4213d';ctx.fillRect(LEFT,layout.headerBottom-12,RIGHT-LEFT,3);
  for(const box of layout.boxes) {ctx.fillStyle=box.color;ctx.fillRect(box.x,box.y,box.width,box.height);}
  ctx.strokeStyle='#dadce1';ctx.beginPath();ctx.moveTo(LEFT,layout.signatureY+6);ctx.lineTo(RIGHT,layout.signatureY+6);ctx.moveTo(LEFT,layout.footerY);ctx.lineTo(RIGHT,layout.footerY);ctx.stroke();
  if(seal) {ctx.save();ctx.globalAlpha=.34;drawImage(ctx,seal,WIDTH/2-66,layout.signatureY+28,132,114);ctx.restore();}
  else {ctx.save();ctx.setLineDash([4,4]);ctx.strokeStyle='#bcbec5';ctx.beginPath();ctx.arc(WIDTH/2,layout.signatureY+83,45,0,Math.PI*2);ctx.stroke();ctx.restore();}
  drawImage(ctx,qr,RIGHT-102,layout.signatureY+48,95,95);
  drawImage(ctx,footer,LEFT,layout.footerY+7,96,24);
  for(const line of layout.lines) {font(ctx,line.size,line.bold);ctx.fillStyle=line.color;ctx.textAlign=line.align??'left';ctx.fillText(line.text,line.x,line.y);}
  return canvas;
}
