import 'server-only';
import { jsPDF } from 'jspdf';
import sharp from 'sharp';

export type ContractPdfData = {
  kind: 'CDD' | 'CDI'; firstName: string; lastName: string; jobTitle: string; workLocation: string;
  startDate: string; endDate: string | null; salary: string; currency: string; clauses: string;
  employer: { companyName: string; companyAddress: string; documentHeader: string; documentFooter: string; directorName: string; directorTitle: string };
  signatureBytes?: Buffer | null; sealBytes?: Buffer | null; employeeSignature?: string | null; employeeSignatureBytes?: Buffer | null; acceptedAt?: string | null;
};

async function asPng(bytes: Buffer, opacity = 1): Promise<string> {
  const raw = await sharp(bytes, { limitInputPixels: 12_000_000 }).resize(600, 300, { fit: 'inside', withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (opacity < 1) for (let i = 3; i < raw.data.length; i += 4) raw.data[i] = Math.round(raw.data[i] * opacity);
  return `data:image/png;base64,${(await sharp(raw.data, { raw: raw.info }).png().toBuffer()).toString('base64')}`;
}

/** PDF rendu côté serveur à partir de l'instantané figé, pas d'un PDF transmis par le navigateur. */
export async function renderContractPdf(data: ContractPdfData): Promise<Buffer> {
  const pdf = new jsPDF({ format: 'a4', unit: 'mm', compress: true });
  let y = 31;
  const newPage = () => { pdf.addPage(); y = 28; };
  const write = (value: string, size = 11, bold = false, gap = 4) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size);
    for (const paragraph of value.replace(/\r\n?/g,'\n').split('\n')) {
      const lines = paragraph ? pdf.splitTextToSize(paragraph, 170) as string[] : [''];
      for (const line of lines) { if (y > 262) newPage(); pdf.text(line, 20, y); y += size * .45 + 2; }
      y += gap;
    }
  };
  pdf.setTextColor(36,36,45);
  write(data.employer.companyName, 16, true);
  write([data.employer.companyAddress,data.employer.documentHeader].filter(Boolean).join(' · '), 9);
  pdf.setDrawColor(158,38,70); pdf.line(20,y,190,y); y += 13;
  write(`CONTRAT ${data.kind} ${data.employeeSignature ? '— EXEMPLAIRE ACCEPTÉ' : '— PROJET À RELIRE'}`, 15, true, 7);
  write(`Employeur : ${data.employer.companyName}`, 11, true);
  write(`Collaborateur : ${data.firstName} ${data.lastName}`, 11, true);
  write(`Fonction : ${data.jobTitle} · Lieu : ${data.workLocation}`);
  write(`Prise d'effet : ${data.startDate}${data.kind === 'CDD' ? ` · Fin indiquée : ${data.endDate}` : ''}`);
  write(`Rémunération déclarée : ${data.salary} ${data.currency} (périodicité et modalités précisées dans les clauses)`,10);
  y += 7; write('CLAUSES CONTRACTUELLES', 12, true, 5); write(data.clauses,11,false,5);
  if (y > 224) newPage();
  y += 8;
  if (data.sealBytes) {
    const seal = await asPng(data.sealBytes,.23);
    pdf.addImage(seal,'PNG',110,y-4,32,32);
  }
  pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.setTextColor(36,36,45);
  pdf.text(`Pour ${data.employer.companyName}`,110,y);
  if (data.signatureBytes) pdf.addImage(await asPng(data.signatureBytes),'PNG',110,y+3,48,23);
  pdf.text(`${data.employer.directorName} · ${data.employer.directorTitle}`,110,y+34, { maxWidth: 80 });
  pdf.text(`Collaborateur : ${data.firstName} ${data.lastName}`,20,y+5,{maxWidth:85});
  if (data.employeeSignature) {
    if (data.employeeSignatureBytes) pdf.addImage(await asPng(data.employeeSignatureBytes),'PNG',20,y+10,52,20);
    pdf.setFont('helvetica','normal'); pdf.setFontSize(8); pdf.text(data.employeeSignature,20,y+35,{maxWidth:85});
    pdf.text(`Accord visuel enregistré le ${data.acceptedAt ?? ''}`,20,y+43,{maxWidth:85});
  } else { pdf.text('Signature et accord à recueillir auprès du collaborateur',20,y+31,{maxWidth:85}); }
  const count = pdf.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    pdf.setPage(page); pdf.setDrawColor(210); pdf.line(20,278,190,278);
    pdf.setFontSize(8); pdf.setFont('helvetica','normal'); pdf.setTextColor(85);
    const footer = data.employer.documentFooter || 'Document RH privé';
    pdf.text((pdf.splitTextToSize(footer, 140) as string[]).slice(0,2),20,283);
    pdf.text(`${page} / ${count}`,190,286,{align:'right'});
    if (!data.employeeSignature) { pdf.setTextColor(158,38,70); pdf.text('PROJET NON ACCEPTÉ',190,13,{align:'right'}); }
  }
  return Buffer.from(pdf.output('arraybuffer'));
}
