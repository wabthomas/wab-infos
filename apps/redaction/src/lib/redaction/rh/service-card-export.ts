'use client';

export type ServiceCardData = {
  id: string; cardType?: 'service'|'press'; verificationUrl?: string; cardNumber: string; issuedAt: string; expiresAt: string;
  firstName: string; lastName: string; jobTitle: string; team: string;
  workLocation: string | null; photo: string | null;
};
export type CardSheetData = { card: ServiceCardData; companyName: string; qr: string; logo: string; companyWebsite?: string; companyEmail?: string; directorName?: string; directorTitle?: string; seal?: string; directorSignature?: string };
type Line = { text:string;x:number;y:number;size:number;color:string;bold?:boolean };
export type CardSheetLayout = { front:Line[];back:Line[];frontX:number;backX:number;cardY:number;cardWidth:number;cardHeight:number };
const W=2480/3, H=3508/3;
// Une fois imprimée à 210 × 297 mm, chaque face mesure exactement 85,6 × 54 mm.
const CARD_W=85.6*W/210, CARD_H=54*H/297;
const FRONT_X=62, BACK_X=W-62-CARD_W, CARD_Y=250;
export class ServiceCardOverflowError extends Error {
  constructor(){super('Les informations de la carte ne tiennent pas lisiblement sur le recto et le verso. Raccourcissez le nom, la fonction, l’équipe ou le lieu dans la fiche RH ; aucun texte ne sera coupé.');}
}
function font(ctx:CanvasRenderingContext2D,size:number,bold=false){ctx.font=`${bold?'bold ':''}${size}px Arial`;}
function wrap(ctx:CanvasRenderingContext2D,text:string,width:number):string[] {
  const lines:string[]=[];
  let line='';
  for(const word of text.trim().split(/\s+/)) {
    let part='';
    for(const char of word) {
      if(ctx.measureText(part+char).width>width&&part){if(line){lines.push(line);line='';}lines.push(part);part=char;}
      else part+=char;
    }
    const next=line?`${line} ${part}`:part;
    if(ctx.measureText(next).width>width&&line){lines.push(line);line=part;}else line=next;
  }
  if(line)lines.push(line);
  return lines;
}

/** Mesure avant tout rendu : pas d'ellipsis, pas de deuxième page ni de texte masqué. */
export function planServiceCardSheet(ctx:CanvasRenderingContext2D,data:CardSheetData):CardSheetLayout {
  const {card}=data;
  const front:Line[]=[],back:Line[]=[];
  function add(target:Line[],text:string,x:number,y:number,size:number,color:string,bold=false){target.push({text,x,y,size,color,bold});}
  function field(target:Line[],text:string,x:number,y:number,size:number,width:number,maxLines:number,step:number,color:string,bold=false){
    font(ctx,size,bold);const lines=wrap(ctx,text,width);
    if(!lines.length||lines.length>maxLines)throw new ServiceCardOverflowError();
    lines.forEach((part,i)=>add(target,part,x,y+i*step,size,color,bold));
  }
  font(ctx,15);
  if(wrap(ctx,data.companyName||'Entreprise',W-124).length>2)throw new ServiceCardOverflowError();
  // RECTO : le QR ne recouvre jamais les coordonnées ou la photo.
  field(front,`${card.firstName} ${card.lastName}`,FRONT_X+94,CARD_Y+67,16,227,2,19,'#ffffff',true);
  field(front,card.jobTitle,FRONT_X+94,CARD_Y+112,12,225,2,16,'#fff1f3',true);
  field(front,[card.team,card.workLocation].filter(Boolean).join(' · '),FRONT_X+94,CARD_Y+149,10,225,2,13,'#e2dfe7');
  field(front,card.cardNumber,FRONT_X+14,CARD_Y+183,11,CARD_W-28,1,12,'#ffffff',true);
  field(front,`Du ${card.issuedAt} au ${card.expiresAt}`,FRONT_X+14,CARD_Y+202,9,CARD_W-28,1,12,'#f2e2e8');
  // VERSO : zone réservée au QR 108 × 108 px, soit près de 27 mm à l’impression.
  field(back,`${card.firstName} ${card.lastName}`,BACK_X+15,CARD_Y+55,13,CARD_W-30,2,16,'#252532',true);
  field(back,`Matricule : ${card.cardNumber}`,BACK_X+15,CARD_Y+88,11,CARD_W-30,1,12,'#252532',true);
  field(back,card.jobTitle,BACK_X+15,CARD_Y+111,11,190,2,14,'#252532',true);
  field(back,[card.team,card.workLocation].filter(Boolean).join(' · '),BACK_X+15,CARD_Y+145,10,190,1,12,'#535964');
  field(back,`Émise : ${card.issuedAt}`,BACK_X+15,CARD_Y+161,9,190,1,12,'#535964');
  field(back,`Expire : ${card.expiresAt}`,BACK_X+15,CARD_Y+174,9,190,1,12,'#535964');
  field(back,'Carte à restituer à la fin de la collaboration.',BACK_X+15,CARD_Y+191,9,190,2,11,'#535964');
  return {front,back,frontX:FRONT_X,backX:BACK_X,cardY:CARD_Y,cardWidth:CARD_W,cardHeight:CARD_H};
}
async function load(src:string|null):Promise<HTMLImageElement|null> {
  if(!src||(!src.startsWith('data:image/')&&!src.startsWith('/')))return null;
  return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src;});
}
function drawCover(ctx:CanvasRenderingContext2D,img:HTMLImageElement|null,x:number,y:number,w:number,h:number){
  if(!img)return;
  const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight);
  ctx.drawImage(img,x+(w-img.naturalWidth*scale)/2,y+(h-img.naturalHeight*scale)/2,img.naturalWidth*scale,img.naturalHeight*scale);
}
function draw(ctx:CanvasRenderingContext2D,img:HTMLImageElement|null,x:number,y:number,w:number,h:number){
  if(!img)return;
  const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight);
  ctx.drawImage(img,x+(w-img.naturalWidth*scale)/2,y+(h-img.naturalHeight*scale)/2,img.naturalWidth*scale,img.naturalHeight*scale);
}
const PRESS_W=54*W/210, PRESS_H=85.6*H/297, PRESS_Y=230;
const PRESS_FRONT_X=140, PRESS_BACK_X=W-140-PRESS_W;
function pressLines(ctx:CanvasRenderingContext2D,text:string,size:number,width:number,maxLines:number):string[] {
  font(ctx,size,true);const lines=wrap(ctx,text,width);
  if(lines.length>maxLines)throw new ServiceCardOverflowError();
  return lines;
}
export function planPressCardSheet(ctx:CanvasRenderingContext2D,data:CardSheetData){
  const {card}=data;
  if(!card.verificationUrl || !/^https?:\/\//.test(card.verificationUrl))throw new ServiceCardOverflowError();
  const name=pressLines(ctx,`${card.firstName} ${card.lastName}`,18,PRESS_W-18,2);
  const role=pressLines(ctx,card.jobTitle,12,PRESS_W-20,1);
  const company=pressLines(ctx,data.companyName,14,PRESS_W-20,2);
  const website=data.companyWebsite?pressLines(ctx,data.companyWebsite,9,PRESS_W-22,1):[];
  const email=data.companyEmail?pressLines(ctx,data.companyEmail,9,PRESS_W-22,1):[];
  const director=data.directorName?pressLines(ctx,data.directorName,8,90,1):[];
  const notice=pressLines(ctx,"Les autorités tant civiles que militaires sont priées d'apporter assistance au porteur de cette carte en cas de nécessité.",7.5,PRESS_W-22,3);
  return {name,role,company,website,email,director,notice,cardWidth:PRESS_W,cardHeight:PRESS_H,frontX:PRESS_FRONT_X,backX:PRESS_BACK_X,cardY:PRESS_Y};
}
function network(ctx:CanvasRenderingContext2D,x:number,y:number,w:number){
  ctx.save();ctx.strokeStyle='rgba(255,255,255,.48)';ctx.lineWidth=1;
  for(let i=0;i<5;i++){const sx=x+(i%2)*26;const sy=y+9+i*13;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+19,sy);ctx.lineTo(sx+31,sy+12);ctx.stroke();ctx.beginPath();ctx.arc(sx+31,sy+12,2.4,0,Math.PI*2);ctx.stroke();}
  for(let i=0;i<5;i++){const sx=x+w-7-(i%2)*22;const sy=y+14+i*15;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx-15,sy);ctx.lineTo(sx-29,sy+10);ctx.stroke();ctx.beginPath();ctx.arc(sx-29,sy+10,2,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
}
async function renderPressSheet(data:CardSheetData,scale:number):Promise<HTMLCanvasElement> {
  const canvas=document.createElement('canvas');canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas indisponible.');ctx.scale(scale,scale);
  const layout=planPressCardSheet(ctx,data);
  const [photo,logo,qr,seal,signature]=await Promise.all([load(data.card.photo),load(data.logo),load(data.qr),load(data.seal||null),load(data.directorSignature||null)]);
  if(!qr||!data.card.photo||!photo)throw new Error('Photo et QR de vérification de la carte de presse requis.');
  if(!logo||!seal||!signature||!data.directorName)throw new Error('Configurez le logo, le sceau, le nom et l’image de signature du DG dans Paramètres RH.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#0b437d';ctx.fillRect(0,0,W,6);
  ctx.fillStyle='#073f79';font(ctx,24,true);ctx.fillText('CARTE DE PRESSE · PLANCHE A4',62,88);
  font(ctx,15);ctx.fillText('Recto et verso portrait à découper et assembler dos à dos · taille réelle (100 %).',62,122);
  ctx.fillText('Carte professionnelle d’entreprise · vérifier le statut actuel en scannant le QR.',62,151);
  const {frontX:fx,backX:bx,cardY:y,cardWidth:cw,cardHeight:ch}=layout;
  for(const x of [fx,bx]){
    ctx.fillStyle='#fff';ctx.fillRect(x,y,cw,ch);
    ctx.fillStyle='#0c437b';ctx.fillRect(x,y,cw,130);
    ctx.strokeStyle='#0c437b';ctx.lineWidth=1;ctx.strokeRect(x,y,cw,ch);
    network(ctx,x,y,cw);
  }
  // Recto : en-tête bleu technique, médaillon photo et informations professionnelles.
  ctx.save();ctx.beginPath();ctx.arc(fx+cw/2,y+139,47,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.clip();drawCover(ctx,photo,fx+cw/2-45,y+94,90,90);ctx.restore();
  ctx.strokeStyle='#083d74';ctx.lineWidth=5;ctx.beginPath();ctx.arc(fx+cw/2,y+139,46,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(fx+cw/2,y+30,22,0,Math.PI*2);ctx.fill();draw(ctx,logo,fx+cw/2-20,y+10,40,40);
  ctx.textAlign='center';ctx.fillStyle='#fff';font(ctx,14,true);layout.company.forEach((text,i)=>ctx.fillText(text,fx+cw/2,y+74+i*16));
  ctx.fillStyle='#1263ab';font(ctx,18,true);layout.name.forEach((text,i)=>ctx.fillText(text,fx+cw/2,y+201+i*19));
  ctx.fillStyle='#06477e';font(ctx,12);layout.role.forEach(text=>ctx.fillText(text,fx+cw/2,y+239));
  font(ctx,9);ctx.fillStyle='#06477e';layout.website.forEach(text=>ctx.fillText(text,fx+cw/2,y+251));layout.email.forEach(text=>ctx.fillText(text,fx+cw/2,y+264));
  ctx.fillStyle='#0e5ca7';ctx.fillRect(fx,y+270,cw,ch-270);
  ctx.fillStyle='#fff';ctx.fillRect(fx+cw/2-34,y+271,68,64);draw(ctx,qr,fx+cw/2-30,y+273,60,60);
  // Verso : modèle presse, sceau et image du DG configurés, mention demandée par l'administration.
  ctx.fillStyle='#fff';ctx.fillRect(bx,y+106,cw,ch-106);
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(bx+cw/2,y+107,46,0,Math.PI*2);ctx.fill();draw(ctx,logo,bx+cw/2-40,y+67,80,80);
  ctx.fillStyle='#101010';font(ctx,30,true);ctx.fillText('PRESSE',bx+cw/2,y+189);
  ctx.save();ctx.globalAlpha=.67;draw(ctx,seal,bx+cw/2-29,y+195,58,56);ctx.restore();
  ctx.textAlign='left';ctx.fillStyle='#151515';font(ctx,9);ctx.fillText(`Émise le ${data.card.issuedAt}`,bx+11,y+260);ctx.fillText(`Expire le ${data.card.expiresAt}`,bx+11,y+273);
  draw(ctx,signature,bx+122,y+257,74,22);font(ctx,8,true);layout.director.forEach(text=>ctx.fillText(text,bx+120,y+288));
  ctx.fillStyle='#ff274b';font(ctx,15,true);ctx.fillText('LAISSEZ PASSER',bx+11,y+304);
  ctx.fillStyle='#101010';font(ctx,7.5);layout.notice.forEach((text,i)=>ctx.fillText(text,bx+11,y+313+i*8));
  ctx.fillStyle='#fff';ctx.fillRect(bx+cw-68,y+193,64,60);draw(ctx,qr,bx+cw-66,y+195,60,56);
  ctx.textAlign='left';ctx.fillStyle='#444';font(ctx,11);ctx.fillText('QR : identité de l’entreprise et statut actuel de la carte (non preuve d’identité du porteur).',62,640);
  ctx.fillText('La mention « Laissez passer » est fournie par l’entreprise ; elle ne confère aucune habilitation publique.',62,665);
  ctx.strokeStyle='#d2d4db';ctx.beginPath();ctx.moveTo(62,H-68);ctx.lineTo(W-62,H-68);ctx.stroke();
  ctx.fillText('Document RH professionnel · recto / verso · format portrait 54 × 85,6 mm',62,H-45);
  ctx.textAlign='right';ctx.fillText('Page 1 / 1',W-62,H-45);
  return canvas;
}

export async function renderServiceCardSheet(data:CardSheetData,scale=3):Promise<HTMLCanvasElement> {
  if(data.card.cardType==='press')return renderPressSheet(data,scale);
  const canvas=document.createElement('canvas');canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas indisponible.');
  ctx.scale(scale,scale);const layout=planServiceCardSheet(ctx,data);
  const [photo,logo,qr]=await Promise.all([load(data.card.photo),load(data.logo),load(data.qr)]);
  if(data.card.photo&&!photo)throw new Error('Photo de la carte illisible.');
  if(!qr)throw new Error('QR d’identité de l’entreprise indisponible.');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#191923';ctx.fillRect(0,0,W,6);
  ctx.fillStyle='#252532';font(ctx,24,true);ctx.fillText('CARTE DE SERVICE · PLANCHE A4',62,88);
  font(ctx,15);ctx.fillStyle='#555b68';wrap(ctx,data.companyName||'Entreprise',W-124).forEach((text,i)=>ctx.fillText(text,62,119+i*18));
  ctx.fillText('Recto et verso à découper et assembler dos à dos · impression à taille réelle (100 %).',62,151);
  ctx.fillText('Ce PDF contient une seule page ; il ne réalise pas une impression recto-verso automatique.',62,177);
  const {frontX,backX,cardY,cardWidth,cardHeight}=layout;
  const bg=ctx.createLinearGradient(frontX,cardY,frontX+cardWidth,cardY+cardHeight);bg.addColorStop(0,'#191923');bg.addColorStop(.65,'#372637');bg.addColorStop(1,'#a71d43');
  ctx.fillStyle=bg;ctx.fillRect(frontX,cardY,cardWidth,cardHeight);
  ctx.fillStyle='#ffffff';ctx.fillRect(backX,cardY,cardWidth,cardHeight);
  ctx.strokeStyle='#ced1d8';ctx.lineWidth=1;ctx.strokeRect(frontX,cardY,cardWidth,cardHeight);ctx.strokeRect(backX,cardY,cardWidth,cardHeight);
  ctx.fillStyle='#a4213d';ctx.fillRect(backX,cardY,cardWidth,7);
  draw(ctx,logo,frontX+14,cardY+12,50,32);
  ctx.fillStyle='#ffdee6';font(ctx,10,true);ctx.fillText('CARTE DE SERVICE',frontX+73,cardY+33);
  ctx.fillStyle='#ffffff';ctx.fillRect(frontX+14,cardY+54,70,96);
  if(photo)draw(ctx,photo,frontX+16,cardY+56,66,92);
  else {ctx.fillStyle='#707080';font(ctx,24,true);ctx.fillText(`${data.card.firstName[0]||''}${data.card.lastName[0]||''}`,frontX+25,cardY+111);}
  ctx.fillStyle='#a4213d';font(ctx,13,true);ctx.fillText('IDENTIFICATION & VALIDITÉ',backX+15,cardY+31);
  ctx.fillStyle='#ffffff';ctx.fillRect(backX+cardWidth-122,cardY+92,116,116);
  draw(ctx,qr,backX+cardWidth-118,cardY+96,108,108);
  for(const line of [...layout.front,...layout.back]){font(ctx,line.size,line.bold);ctx.fillStyle=line.color;ctx.fillText(line.text,line.x,line.y);}
  ctx.fillStyle='#535964';font(ctx,11);ctx.fillText('QR : identité de l’entreprise uniquement ; la validité de la carte doit être confirmée auprès des RH.',62,520);
  ctx.fillText('Découpez les deux faces sur leur contour et assemblez-les. Ne diffusez pas cette planche hors du cadre professionnel.',62,546);
  ctx.strokeStyle='#ced1d8';ctx.beginPath();ctx.moveTo(62,H-68);ctx.lineTo(W-62,H-68);ctx.stroke();
  ctx.fillText('Document RH personnel · recto / verso · format 85,6 × 54 mm',62,H-45);
  ctx.textAlign='right';ctx.fillText('Page 1 / 1',W-62,H-45);
  return canvas;
}
