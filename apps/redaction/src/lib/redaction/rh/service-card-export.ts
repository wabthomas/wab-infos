'use client';

export type ServiceCardData = {
  id: string; cardType?: 'service'|'press'; verificationUrl?: string; cardNumber: string; issuedAt: string; expiresAt: string;
  firstName: string; lastName: string; jobTitle: string; team: string;
  workLocation: string | null; photo: string | null;
};
export type PhotoCrop = { zoom:number; x:number; y:number };
export type CardSheetData = { card: ServiceCardData; photoCrop?:PhotoCrop; companyName: string; qr: string; logo: string; companyWebsite?: string; companyEmail?: string; directorName?: string; directorTitle?: string; seal?: string; directorSignature?: string };
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
export function photoPlacement(imageWidth:number,imageHeight:number,w:number,h:number,crop:PhotoCrop={zoom:1,x:0,y:0}) {
  const zoom=Math.min(3,Math.max(1,Number.isFinite(crop.zoom)?crop.zoom:1));
  const scale=Math.max(w/imageWidth,h/imageHeight)*zoom;
  const width=imageWidth*scale,height=imageHeight*scale;
  const panX=Math.min(1,Math.max(-1,Number.isFinite(crop.x)?crop.x:0));
  const panY=Math.min(1,Math.max(-1,Number.isFinite(crop.y)?crop.y:0));
  return {x:(w-width)/2+(width-w)/2*panX,y:(h-height)/2+(height-h)/2*panY,width,height};
}
export function drawCroppedPhoto(ctx:CanvasRenderingContext2D,img:HTMLImageElement,x:number,y:number,w:number,h:number,crop?:PhotoCrop){
  const placement=photoPlacement(img.naturalWidth,img.naturalHeight,w,h,crop);
  ctx.drawImage(img,x+placement.x,y+placement.y,placement.width,placement.height);
}
function draw(ctx:CanvasRenderingContext2D,img:HTMLImageElement|null,x:number,y:number,w:number,h:number){
  if(!img)return;
  const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight);
  ctx.drawImage(img,x+(w-img.naturalWidth*scale)/2,y+(h-img.naturalHeight*scale)/2,img.naturalWidth*scale,img.naturalHeight*scale);
}
const PRESS_W=54*W/210, PRESS_H=85.6*H/297, PRESS_Y=230;
const PRESS_FRONT_X=140, PRESS_BACK_X=W-140-PRESS_W;
function pressFont(ctx:CanvasRenderingContext2D,size:number,bold=false){ctx.font=`${bold?'700':'400'} ${size}px system-ui, sans-serif`;}
function pressLines(ctx:CanvasRenderingContext2D,text:string,size:number,width:number,maxLines:number):string[] {
  pressFont(ctx,size,true);const lines=wrap(ctx,text,width);
  if(lines.length>maxLines)throw new ServiceCardOverflowError();
  return lines;
}
export function planPressCardSheet(ctx:CanvasRenderingContext2D,data:CardSheetData){
  const {card}=data;
  if(!card.verificationUrl || !/^https?:\/\//.test(card.verificationUrl))throw new ServiceCardOverflowError();
  const name=pressLines(ctx,`${card.firstName} ${card.lastName}`,18,PRESS_W-18,2);
  const role=pressLines(ctx,card.jobTitle,12,PRESS_W-78,1);
  const company=pressLines(ctx,data.companyName,14,PRESS_W-20,2);
  const website=data.companyWebsite?pressLines(ctx,data.companyWebsite,9,PRESS_W-46,1):[];
  const email=data.companyEmail?pressLines(ctx,data.companyEmail,9,PRESS_W-46,1):[];
  const director=data.directorName?pressLines(ctx,data.directorName,8,90,1):[];
  const notice=pressLines(ctx,"Les autorités tant civiles que militaires sont priées d'apporter assistance au porteur de cette carte en cas de nécessité.",7.5,PRESS_W-22,3);
  return {name,role,company,website,email,director,notice,cardWidth:PRESS_W,cardHeight:PRESS_H,frontX:PRESS_FRONT_X,backX:PRESS_BACK_X,cardY:PRESS_Y};
}
function network(ctx:CanvasRenderingContext2D,x:number,y:number,w:number){
  ctx.save();ctx.strokeStyle='rgba(222,243,255,.60)';ctx.lineWidth=.8;
  for(let i=0;i<5;i++){
    const sy=y+12+i*15, left=x+(i%2)*9, right=x+w-(i%2)*8;
    ctx.beginPath();ctx.moveTo(left,sy);ctx.lineTo(left+19,sy);ctx.lineTo(left+27,sy+9);ctx.stroke();
    ctx.beginPath();ctx.arc(left+27,sy+9,1.5,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(right,sy+2);ctx.lineTo(right-17,sy+2);ctx.lineTo(right-26,sy+11);ctx.stroke();
    ctx.beginPath();ctx.arc(right-26,sy+11,1.5,0,Math.PI*2);ctx.stroke();
  }
  ctx.strokeStyle='rgba(2,25,65,.34)';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(x+2,y+96);ctx.lineTo(x+42,y+130);ctx.moveTo(x+w-2,y+87);ctx.lineTo(x+w-37,y+130);ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.52)';
  for(let row=0;row<3;row++)for(let col=0;col<7;col++){
    ctx.beginPath();ctx.arc(x+w-55+col*4,y+99+row*4,0.7,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
function curvedFooter(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,top:number){
  ctx.save();
  const gradient=ctx.createLinearGradient(x,y+top,x+w,y+h);
  gradient.addColorStop(0,'#1167b4');gradient.addColorStop(1,'#06457f');
  ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(x,y+top);
  ctx.quadraticCurveTo(x+w/2,y+top+40,x+w,y+top);
  ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(184,224,255,.18)';ctx.lineWidth=.8;
  for(const side of [0,1]){
    const sx=side?x+w:x;
    ctx.beginPath();ctx.moveTo(sx,y+h-12);ctx.lineTo(sx+(side?-28:28),y+h-38);
    ctx.moveTo(sx,y+h-25);ctx.lineTo(sx+(side?-20:20),y+h-44);ctx.stroke();
  }
  ctx.restore();
}
function contactIcon(ctx:CanvasRenderingContext2D,x:number,y:number,kind:'web'|'mail'){
  ctx.save();ctx.fillStyle='#1167b4';ctx.beginPath();ctx.arc(x,y,5.5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#fff';ctx.lineWidth=.8;
  if(kind==='web'){
    ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);
    ctx.moveTo(x,y-3);ctx.lineTo(x,y+3);ctx.stroke();
  }else{
    ctx.strokeRect(x-3,y-2,6,4);ctx.beginPath();ctx.moveTo(x-3,y-2);ctx.lineTo(x,y+1);ctx.lineTo(x+3,y-2);ctx.stroke();
  }
  ctx.restore();
}
function qrFrame(ctx:CanvasRenderingContext2D,x:number,y:number){
  ctx.save();ctx.fillStyle='#fff';ctx.strokeStyle='#1a5d9e';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(x+6,y);ctx.lineTo(x+62,y);ctx.quadraticCurveTo(x+68,y,x+68,y+6);
  ctx.lineTo(x+68,y+62);ctx.quadraticCurveTo(x+68,y+68,x+62,y+68);
  ctx.lineTo(x+6,y+68);ctx.quadraticCurveTo(x,y+68,x,y+62);
  ctx.lineTo(x,y+6);ctx.quadraticCurveTo(x,y,x+6,y);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}
async function renderPressSheet(data:CardSheetData,scale:number):Promise<HTMLCanvasElement> {
  const canvas=document.createElement('canvas');canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas indisponible.');ctx.scale(scale,scale);
  const layout=planPressCardSheet(ctx,data);
  const [photo,logo,qr,seal,signature]=await Promise.all([load(data.card.photo),load(data.logo),load(data.qr),load(data.seal||null),load(data.directorSignature||null)]);
  if(!qr||!data.card.photo||!photo)throw new Error('Photo et QR de vérification de la carte de presse requis.');
  if(!logo||!seal||!signature||!data.directorName)throw new Error('Configurez le logo, le sceau, le nom et l’image de signature du DG dans Paramètres RH.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#0b437d';ctx.fillRect(0,0,W,6);
  ctx.fillStyle='#073f79';pressFont(ctx,24,true);ctx.fillText('CARTE DE PRESSE · PLANCHE A4',62,88);
  pressFont(ctx,15);ctx.fillText('Recto et verso portrait à découper et assembler dos à dos · taille réelle (100 %).',62,122);
  ctx.fillText('Carte professionnelle d’entreprise · vérifier le statut actuel en scannant le QR.',62,151);
  const {frontX:fx,backX:bx,cardY:y,cardWidth:cw,cardHeight:ch}=layout;
  for(const x of [fx,bx]){
    ctx.fillStyle='#fff';ctx.fillRect(x,y,cw,ch);
    const header=ctx.createLinearGradient(x,y,x+cw,y+130);
    header.addColorStop(0,'#073a71');header.addColorStop(.6,'#10518f');header.addColorStop(1,'#063a72');
    ctx.fillStyle=header;ctx.fillRect(x,y,cw,130);
    network(ctx,x,y,cw);
  }
  // RECTO : identité, charte bleue et rose, contacts avec pictogrammes.
  ctx.fillStyle='#ed008c';ctx.beginPath();ctx.moveTo(fx+49,y+169);ctx.lineTo(fx+83,y+169);ctx.lineTo(fx+49,y+188);ctx.fill();
  ctx.fillStyle='#0572b5';ctx.beginPath();ctx.moveTo(fx+cw-49,y+167);ctx.lineTo(fx+cw-82,y+167);ctx.lineTo(fx+cw-49,y+186);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(fx+cw/2,y+30,23,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#ec008c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(fx+cw/2,y+30,21,-2.4,-.2);ctx.stroke();
  draw(ctx,logo,fx+cw/2-20,y+10,40,40);
  ctx.textAlign='center';ctx.fillStyle='#fff';pressFont(ctx,14,true);
  layout.company.forEach((text,i)=>ctx.fillText(text,fx+cw/2,y+74+i*16));
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(fx+cw/2,y+139,48,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.beginPath();ctx.arc(fx+cw/2,y+139,45,0,Math.PI*2);ctx.clip();drawCroppedPhoto(ctx,photo,fx+cw/2-45,y+94,90,90,data.photoCrop);ctx.restore();
  ctx.strokeStyle='#07467d';ctx.lineWidth=3;ctx.beginPath();ctx.arc(fx+cw/2,y+139,46,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#ed008c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(fx+cw/2,y+139,47,-.9,-.15);ctx.stroke();
  ctx.fillStyle='#1263ab';pressFont(ctx,18,true);
  layout.name.forEach((text,i)=>ctx.fillText(text,fx+cw/2,y+201+i*19));
  const roleY=y+217+(layout.name.length-1)*19;
  ctx.strokeStyle='#07508b';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.beginPath();
  ctx.moveTo(fx+15,roleY-4);ctx.lineTo(fx+60,roleY-4);ctx.stroke();ctx.lineCap='butt';
  ctx.textAlign='left';ctx.fillStyle='#06477e';pressFont(ctx,12,true);
  layout.role.forEach(text=>ctx.fillText(text,fx+73,roleY));
  ctx.fillStyle='#06477e';pressFont(ctx,9);
  layout.website.forEach(text=>{contactIcon(ctx,fx+21,y+248,'web');ctx.fillText(text,fx+35,y+251);});
  layout.email.forEach(text=>{contactIcon(ctx,fx+21,y+261,'mail');ctx.fillText(text,fx+35,y+264);});
  curvedFooter(ctx,fx,y,cw,ch,273);
  qrFrame(ctx,fx+cw/2-34,y+265);
  draw(ctx,qr,fx+cw/2-30,y+269,60,60);
  ctx.textAlign='left';ctx.fillStyle='#eaf6ff';pressFont(ctx,7,true);ctx.fillText('SCAN',fx+11,y+328);
  // VERSO : sceau et signature, QR uniquement sur le recto ; bas de carte en bleu courbe.
  ctx.textAlign='center';ctx.fillStyle='#fff';pressFont(ctx,12,true);ctx.fillText('CARTE DE PRESSE',bx+cw/2,y+31);
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(bx+cw/2,y+107,43,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#ed008c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(bx+cw/2,y+107,41,-2.5,-.3);ctx.stroke();
  draw(ctx,logo,bx+cw/2-38,y+69,76,76);
  ctx.fillStyle='#101010';pressFont(ctx,30,true);ctx.fillText('PRESSE',bx+cw/2,y+187);
  ctx.save();ctx.globalAlpha=.68;draw(ctx,seal,bx+cw/2-31,y+191,62,61);ctx.restore();
  ctx.textAlign='left';ctx.fillStyle='#143d65';pressFont(ctx,9);
  ctx.fillText(`Émise le ${data.card.issuedAt}`,bx+11,y+255);
  ctx.fillText(`Expire le ${data.card.expiresAt}`,bx+11,y+269);
  draw(ctx,signature,bx+122,y+238,74,21);
  ctx.fillStyle='#132f4b';pressFont(ctx,8,true);
  layout.director.forEach(text=>ctx.fillText(text,bx+120,y+268));
  curvedFooter(ctx,bx,y,cw,ch,268);
  ctx.fillStyle='#ffd83d';ctx.beginPath();ctx.arc(bx+19,y+294,7,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#06477e';pressFont(ctx,10,true);ctx.textAlign='center';ctx.fillText('i',bx+19,y+297);
  ctx.textAlign='left';ctx.fillStyle='#fff';pressFont(ctx,14,true);
  ctx.fillText('LAISSEZ PASSER',bx+31,y+303);
  pressFont(ctx,7.5);ctx.fillStyle='#fff';
  layout.notice.forEach((text,i)=>ctx.fillText(text,bx+11,y+312+i*8));
  for(const x of [fx,bx]){ctx.strokeStyle='#0c437b';ctx.lineWidth=1;ctx.strokeRect(x,y,cw,ch);}
  ctx.textAlign='left';ctx.fillStyle='#444';pressFont(ctx,11);ctx.fillText('QR : identité de l’entreprise et statut actuel de la carte (non preuve d’identité du porteur).',62,640);
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
