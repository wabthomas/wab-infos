'use client';
import { BrowserDocumentLink } from './browser-document-link';
import { deliverRhDocument } from '@/lib/redaction/rh/browser-document';
import { useRhNotice } from './use-rh-notice';
import { useState, type FormEvent } from 'react';
import { Download, FileSpreadsheet, LockKeyhole } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { parseReportFilter, type ReportType } from '@/lib/redaction/rh/reports';

type ReportFormat = 'csv' | 'pdf';
const reportLabels: Record<ReportType, string> = { collaborateurs: 'Collaborateurs', absences: 'Congés et absences', prestations: 'Prestations enregistrées', presence: 'Présence et pointages' };

async function saveReportPdf(blob:Blob,filename:string):Promise<string|null> { return deliverRhDocument(blob,filename); }

export function Reports({ today }: { today: string }) {
  const [browserLink,setBrowserLink]=useState<string|null>(null);
  const [type, setType] = useState<ReportType>('collaborateurs');
  const [format, setFormat] = useState<ReportFormat>('csv');
  const [start, setStart] = useState(`${today.slice(0, 7)}-01`); const [end, setEnd] = useState(today);
  const [team, setTeam] = useState(''); const [busy, setBusy] = useState(false);
  const [error, setError] = useRhNotice('error'); const [message, setMessage] = useRhNotice('success');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('');
    const params = new URLSearchParams({ type, team, format: format === 'pdf' ? 'json' : 'csv' });
    if (type !== 'collaborateurs') { params.set('start', start); params.set('end', end); }
    if (!parseReportFilter(params)) { setError('Vérifiez les filtres et les dates (366 jours maximum).'); return; }
    setBusy(true);
    try {
      const response = await fetchRedaction(`/api/redaction/rh/rapports?${params}`, { method: 'POST', cache: 'no-store' });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Export indisponible.'); }
      if (format === 'csv') {
        const blob = new Blob([await response.arrayBuffer()], {type:'text/csv'});
        setBrowserLink(await deliverRhDocument(blob,`rh-${type}.csv`));
      } else {
        const data = await response.json() as { headers: string[]; rows: unknown[][] };
        const { jsPDF } = await import('jspdf');
        const { loadRhBranding } = await import('@/lib/redaction/rh/record-sheet-pdf');
        const brand = await loadRhBranding();
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
        const pageWidth = pdf.internal.pageSize.getWidth(); const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 12; const tableWidth = pageWidth - margin * 2; const columnWidth = tableWidth / Math.max(data.headers.length, 1);
        const headerHeight = 11; let y = 52;
        const period = type === 'collaborateurs' ? 'Tous les dossiers' : `Période : ${start} au ${end}`;
        const drawLetterhead = () => {
          pdf.setFillColor(23,29,43); pdf.rect(0,0,pageWidth,29,'F');
          const image = brand.header;
          if(image) {const scale=Math.min(48/image.width,19/image.height);pdf.addImage(image.data,'JPEG',margin,5,image.width*scale,image.height*scale,undefined,'FAST');}
          const headingX=image?margin+53:margin;
          pdf.setTextColor(255);pdf.setFont('helvetica','bold');pdf.setFontSize(11);
          pdf.text(pdf.splitTextToSize(brand.settings.companyName||'Wab-infos',pageWidth-headingX-margin).slice(0,1),headingX,13);
          pdf.setFont('helvetica','normal');pdf.setFontSize(8);
          pdf.text(pdf.splitTextToSize(brand.settings.documentHeader||'Ressources humaines · document interne',pageWidth-headingX-margin).slice(0,1),headingX,20);
          pdf.setTextColor(25,25,35);pdf.setFont('helvetica','bold');pdf.setFontSize(12);
          pdf.text(`Rapport RH · ${reportLabels[type]}`,margin,36);
          pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(100);
          pdf.text(`${period}${team.trim() ? ` · Équipe : ${team.trim()}` : ''} · Généré le ${new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Kinshasa',dateStyle:'short'}).format(new Date())}`,margin,43,{maxWidth:tableWidth});
          pdf.setDrawColor(215);pdf.line(margin,pageHeight-15,pageWidth-margin,pageHeight-15);
          if(brand.footer){const f=brand.footer;const ratio=Math.min(40/f.width,10/f.height);pdf.addImage(f.data,'JPEG',margin,pageHeight-13,f.width*ratio,f.height*ratio,undefined,'FAST');}
          pdf.setFont('helvetica','normal');pdf.setTextColor(105);pdf.setFontSize(7);
          pdf.text(pdf.splitTextToSize(brand.settings.documentFooter||'Document interne — émis par Wab-infos.',pageWidth-margin*2-(brand.footer?47:0)).slice(0,2),margin+(brand.footer?47:0),pageHeight-10);
        };
        drawLetterhead();
        const drawHeader = () => {
          pdf.setFillColor(34, 39, 51); pdf.rect(margin, y, tableWidth, headerHeight, 'F');
          data.headers.forEach((header, index) => {
            const x = margin + index * columnWidth;
            pdf.setTextColor(255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7);
            pdf.text(pdf.splitTextToSize(header, columnWidth - 3).slice(0, 2), x + 1.5, y + 4.5);
          });
          y += headerHeight;
        };
        drawHeader();
        for (const row of data.rows) {
          const cells = data.headers.map((_, index) => pdf.splitTextToSize(String(row[index] ?? '—').replace(/\s+/g, ' '), Math.max(columnWidth - 4, 10)).slice(0, 3));
          const rowHeight = Math.max(8, ...cells.map((cell) => cell.length * 3.4 + 3));
          if (y + rowHeight > pageHeight - 18) { pdf.addPage(); y = 52; drawLetterhead(); drawHeader(); }
          row.forEach((_, index) => {
            const x = margin + index * columnWidth;
            pdf.setDrawColor(220); pdf.setFillColor(255, 255, 255); pdf.rect(x, y, columnWidth, rowHeight, 'FD');
            pdf.setTextColor(35, 39, 48); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7);
            pdf.text(cells[index], x + 1.5, y + 4.5);
          });
          y += rowHeight;
        }
        const totalPages = pdf.getNumberOfPages();
        for (let page = 1; page <= totalPages; page++) { pdf.setPage(page); pdf.setTextColor(130); pdf.setFontSize(7); pdf.text(`Lignes : ${data.rows.length} · Page ${page}/${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' }); }
        setBrowserLink(await saveReportPdf(pdf.output('blob'), `rh-${type}-${start || today}.pdf`));
      }
      setMessage(`Rapport ${format.toUpperCase()} généré. Conservez le fichier dans un emplacement sécurisé.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Export impossible.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
    <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/[0.07] text-primary"><FileSpreadsheet className="h-5 w-5" /></span>
      <div><h3 className="font-semibold">Exporter un rapport</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Téléchargez ou imprimez un rapport RH en CSV ou en PDF. Chaque génération est journalisée.</p></div></div>
    <div className="flex gap-3 rounded-xl bg-amber-500/[0.08] p-4"><LockKeyhole className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" /><p className="text-xs leading-5 text-muted-foreground">Ces fichiers contiennent des informations personnelles. Chaque export est journalisé. Les rémunérations, références de paiement et descriptions d’activité sont exclus.</p></div>
    <BrowserDocumentLink url={browserLink}/>
    {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}{message && <p role="status" className="text-sm text-primary">{message}</p>}
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label className="block text-sm font-medium">Rapport
        <select value={type} onChange={(e) => setType(e.target.value as ReportType)} disabled={busy} className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"><option value="collaborateurs">Collaborateurs</option><option value="absences">Congés et absences</option><option value="prestations">Prestations enregistrées</option></select>
      </label><label className="block text-sm font-medium">Équipe <span className="font-normal text-muted-foreground">(facultatif, nom exact)</span>
        <input value={team} maxLength={150} onChange={(e) => setTeam(e.target.value)} disabled={busy} placeholder="Ex. Production audiovisuelle" className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
      </label><label className="block text-sm font-medium">Format
        <select value={format} onChange={(e) => setFormat(e.target.value as ReportFormat)} disabled={busy} className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"><option value="csv">CSV (tableur)</option><option value="pdf">PDF (imprimable)</option></select>
      </label></div>
      {type !== 'collaborateurs' && <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Du<input type="date" min="1900-01-01" required value={start} onChange={(e) => setStart(e.target.value)} disabled={busy} className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /></label><label className="block text-sm font-medium">Au<input type="date" min={start || '1900-01-01'} required value={end} onChange={(e) => setEnd(e.target.value)} disabled={busy} className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /></label></div>}
      <p className="text-xs leading-5 text-muted-foreground">Les absences qui chevauchent la période sont incluses. Les prestations sont les relevés enregistrés, pas les déclarations en attente. Maximum 5 000 lignes par export ; filtrez par équipe ou réduisez la période si nécessaire.</p>
      <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"><Download className="h-4 w-4" />{busy ? 'Préparation…' : format === 'pdf' ? 'Télécharger le PDF' : 'Télécharger le CSV'}</button>
    </form>
  </section>;
}
