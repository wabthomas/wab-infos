import type { SheetFilter, SheetRow } from './record-sheets';
import { paymentSheetTotals } from './record-sheet-totals';
import { DEFAULT_ORGANIZATION_SETTINGS, type OrganizationSettings } from './organization';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { formatMinorUnits } from './money';

export type SheetData = { person: {id:string;firstName:string;lastName:string;team:string}; filter:SheetFilter; rows:SheetRow[] };
const titles = { presence:'FICHE DE PRÉSENCE', prestations:'FICHE DES PRESTATIONS', paiements:'FICHE DES PAIEMENTS' };

async function jpeg(source: string | undefined): Promise<{data:string;width:number;height:number}|null> {
  if (!source?.startsWith('data:image/')) return null;
  return new Promise((resolve)=>{
    const image=new Image();
    image.onerror=()=>resolve(null);
    image.onload=()=>{ try {const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');if(!ctx) return resolve(null);ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0);resolve({data:canvas.toDataURL('image/jpeg',.86),width:canvas.width,height:canvas.height});} catch {resolve(null);} };
    image.src=source;
  });
}

export async function loadRhBranding() {
  const response = await fetchRedaction('/api/redaction/rh/organisation',{cache:'no-store'});
  if (!response.ok) throw new Error('Entête de l’entreprise indisponible : PDF non créé.');
  const settings = { ...DEFAULT_ORGANIZATION_SETTINGS, ...((await response.json()).settings??{}) } as OrganizationSettings;
  const assets = await Promise.all(['document-header','company-logo','document-footer'].map(async(key)=>{
    try {const r=await fetchRedaction(`/api/redaction/rh/organisation/assets/${key}`,{cache:'no-store'});if(!r.ok)return null;const data=await r.json();return await jpeg(data.asset);} catch {return null;}
  }));
  return { settings, header: assets[0]??assets[1], footer: assets[2] };
}

export async function buildRecordSheetPdf(data: SheetData): Promise<Blob> {
  const [{ jsPDF }, brand] = await Promise.all([import('jspdf'),loadRhBranding()]);
  const pdf = new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  const width=210, height=297, margin=15, usable=width-margin*2;
  const {settings,header,footer}=brand;
  function imageAt(image:{data:string;width:number;height:number}|null,x:number,y:number,maxWidth:number,maxHeight:number) {
    if(!image)return;
    const ratio=Math.min(maxWidth/image.width,maxHeight/image.height);
    pdf.addImage(image.data,'JPEG',x,y,image.width*ratio,image.height*ratio,undefined,'FAST');
  }
  function fit(text:string,maxWidth:number,maxLines=2) {return pdf.splitTextToSize(text.replace(/\s+/g,' ').trim()||'—',maxWidth).slice(0,maxLines) as string[];}
  function drawFrame() {
    pdf.setFillColor(23,29,43);pdf.rect(0,0,width,37,'F');
    if(header)imageAt(header,margin,6,55,19);
    pdf.setFont('helvetica','bold');pdf.setTextColor(255);pdf.setFontSize(10);
    pdf.text(fit(settings.companyName||'Wab-infos',header?108:usable,1),header?76:margin,15);
    pdf.setFontSize(8);pdf.setFont('helvetica','normal');
    pdf.text(fit(settings.documentHeader||'Ressources humaines · document interne',header?108:usable,2),header?76:margin,22);
    pdf.setDrawColor(215);pdf.line(margin,270,width-margin,270);
    if(footer)imageAt(footer,margin,274,50,11);
    pdf.setTextColor(98);pdf.setFontSize(7);
    const footX=footer?70:margin;
    pdf.text(fit(settings.documentFooter||'Document interne — émis par Wab-infos.',width-margin-footX,2),footX,278);
    pdf.text(fit([settings.companyAddress,settings.companyPhone,settings.companyEmail].filter(Boolean).join(' · '),width-margin-footX,1),footX,287);
  }
  let y=46;
  function page() {pdf.addPage();drawFrame();y=46;}
  drawFrame();
  pdf.setTextColor(25,29,42);pdf.setFont('helvetica','bold');pdf.setFontSize(15);pdf.text(titles[data.filter.type],margin,y);y+=8;
  pdf.setFontSize(10);pdf.text(fit(`${data.person.firstName} ${data.person.lastName} · ${data.person.team}`,usable,2),margin,y);y+=7;
  pdf.setTextColor(90);pdf.setFont('helvetica','normal');pdf.setFontSize(8);
  pdf.text(`Période : ${data.filter.start} au ${data.filter.end} · ${data.rows.length} entrée(s) · Émis le ${new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Kinshasa',dateStyle:'short'}).format(new Date())}`,margin,y);y+=7;
  if(data.filter.type==='paiements') {
    for(const [currency,total] of paymentSheetTotals(data.rows)) {
      if(y>251)page();
      pdf.setFillColor(245,246,249);pdf.roundedRect(margin,y,usable,14,2,2,'F');
      pdf.setTextColor(28,38,52);pdf.setFont('helvetica','bold');pdf.setFontSize(8);
      pdf.text(`${currency} · Vérifié (hors doublons) : ${formatMinorUnits(total.confirmed,currency as 'USD'|'CDF')}`,margin+3,y+5);
      pdf.setFont('helvetica','normal');pdf.text(`À vérifier (non inclus) : ${formatMinorUnits(total.pending,currency as 'USD'|'CDF')} · Rapprochés : ${total.matched}`,margin+3,y+10);
      y+=18;
    }
    if(y>251)page();
    pdf.setTextColor(125,80,25);pdf.setFont('helvetica','normal');pdf.setFontSize(7);
    pdf.text(fit('Déclarations non vérifiées, refusées et annulées hors totaux. Un rapprochement n’est pas compté deux fois. Cette fiche ne prouve pas l’exhaustivité des archives.',usable,3),margin,y);y+=12;
  }
  if(!data.rows.length){pdf.setTextColor(100);pdf.setFontSize(10);pdf.text('Aucune entrée pour cette période.',margin,y);}
  for(const row of data.rows){
    pdf.setFont('helvetica','normal');pdf.setFontSize(8);
    const detail=fit(row.details,usable-10,14);
    const reference=row.reference?fit(`Référence : ${row.reference}`,usable-10,2):[];
    const amount=row.amountMinor&&row.currency ? ` · ${formatMinorUnits(BigInt(row.amountMinor),row.currency as 'USD'|'CDF')}`:'';
    const h=Math.max(18,13+(detail.length+reference.length)*4);
    if(y+h>265)page();
    pdf.setDrawColor(225);pdf.setFillColor(250,250,251);pdf.roundedRect(margin,y,usable,h,2,2,'FD');
    pdf.setFont('helvetica','bold');pdf.setTextColor(28,35,48);pdf.setFontSize(9);
    pdf.text(fit(`${row.date} · ${row.category}${amount}`,usable-9,1),margin+4,y+6);
    pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(80);
    pdf.text(fit(row.status,usable-9,1),margin+4,y+11);
    if(detail.length)pdf.text(detail,margin+4,y+15);
    if(reference.length)pdf.text(reference,margin+4,y+15+detail.length*4);
    y+=h+3;
  }
  const totalPages=pdf.getNumberOfPages();
  for(let i=1;i<=totalPages;i++){pdf.setPage(i);pdf.setFontSize(7);pdf.setTextColor(110);pdf.text(`${i} / ${totalPages}`,width-margin,287,{align:'right'});}
  return pdf.output('blob');
}
