'use client';

export type ServiceCardData = {
  id: string; cardNumber: string; issuedAt: string; expiresAt: string;
  firstName: string; lastName: string; jobTitle: string; team: string;
  workLocation: string | null; photo: string | null;
};
export type CardSheetData = { card: ServiceCardData; companyName: string; qr: string; logo: string };
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
function draw(ctx:CanvasRenderingContext2D,img:HTMLImageElement|null,x:number,y:number,w:number,h:number){
  if(!img)return;
  const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight);
  ctx.drawImage(img,x+(w-img.naturalWidth*scale)/2,y+(h-img.naturalHeight*scale)/2,img.naturalWidth*scale,img.naturalHeight*scale);
}
export async function renderServiceCardSheet(data:CardSheetData,scale=3):Promise<HTMLCanvasElement> {
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
