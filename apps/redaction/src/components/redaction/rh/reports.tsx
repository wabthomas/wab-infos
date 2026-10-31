'use client';
import { useState, type FormEvent } from 'react';
import { Download, FileSpreadsheet, LockKeyhole } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { saveBlobToAndroid } from '@wab-infos/shared';
import { parseReportFilter, type ReportType } from '@/lib/redaction/rh/reports';

type ReportFormat = 'csv' | 'pdf';
const reportLabels: Record<ReportType, string> = { collaborateurs: 'Collaborateurs', absences: 'Congés et absences', prestations: 'Prestations enregistrées', presence: 'Pointages de présence' };

async function saveReportPdf(blob: Blob, filename: string) {
  if (await saveBlobToAndroid(blob, filename, 'application/pdf')) return;
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Rapport RH' }); return; }
    catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.hidden = true;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function Reports({ today }: { today: string }) {
  const [type, setType] = useState<ReportType>('collaborateurs');
  const [format, setFormat] = useState<ReportFormat>('csv');
  const [start, setStart] = useState(`${today.slice(0, 7)}-01`); const [end, setEnd] = useState(today);
  const [team, setTeam] = useState(''); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
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
        const blob = await response.blob();
        const filename = `rh-${type}.csv`;
        if (await saveBlobToAndroid(blob, filename, 'text/csv')) {
          // Le sélecteur natif Android demande où enregistrer le CSV.
        } else {
          const url = URL.createObjectURL(blob);
          try { const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); }
          finally { window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
        }
      } else {
        const data = await response.json() as { headers: string[]; rows: unknown[][] };
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
        const pageWidth = pdf.internal.pageSize.getWidth(); const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 12; const tableWidth = pageWidth - margin * 2; const columnWidth = tableWidth / Math.max(data.headers.length, 1);
        const headerHeight = 9; let y = 31;
        const onePageRows = data.rows.slice(0, 12);
        pdf.setTextColor(25, 25, 35); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(17); pdf.text(`Rapport RH · ${reportLabels[type]}`, margin, 17);
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(100);
        const period = type === 'collaborateurs' ? 'Tous les dossiers' : `Période : ${start} au ${end}`;
        pdf.text(`${period}${team.trim() ? ` · Équipe : ${team.trim()}` : ''} · Généré le ${new Date().toLocaleDateString('fr-FR')}`, margin, 24);
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
        for (const row of onePageRows) {
          const cells = data.headers.map((_, index) => pdf.splitTextToSize(String(row[index] ?? '—').replace(/\s+/g, ' '), Math.max(columnWidth - 4, 10)).slice(0, 3));
          const rowHeight = Math.max(6, ...cells.map((cell) => cell.length * 2.8 + 2));
          row.forEach((_, index) => {
            const x = margin + index * columnWidth;
            pdf.setDrawColor(220); pdf.setFillColor(255, 255, 255); pdf.rect(x, y, columnWidth, rowHeight, 'FD');
            pdf.setTextColor(35, 39, 48); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.2);
            pdf.text(cells[index], x + 1.5, y + 3.7);
          });
          y += rowHeight;
        }
        pdf.setTextColor(110); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7);
        const rangeNote = data.rows.length > onePageRows.length ? ` · PDF limité aux ${onePageRows.length} premières lignes ; le CSV contient le rapport complet.` : '';
        pdf.text(`Lignes : ${data.rows.length}${rangeNote}`, margin, Math.min(y + 5, pageHeight - 12), { maxWidth: tableWidth - 30 });
        pdf.setTextColor(130); pdf.setFontSize(7); pdf.text('Page unique', pageWidth - margin, pageHeight - 6, { align: 'right' });
        await saveReportPdf(pdf.output('blob'), `rh-${type}-${start || today}.pdf`);
      }
      setMessage(`Rapport ${format.toUpperCase()} généré. Conservez le fichier dans un emplacement sécurisé.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Export impossible.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
    <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/[0.07] text-primary"><FileSpreadsheet className="h-5 w-5" /></span>
      <div><h3 className="font-semibold">Exporter un rapport</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Téléchargez ou imprimez un rapport RH en CSV ou en PDF. Chaque génération est journalisée.</p></div></div>
    <div className="flex gap-3 rounded-xl bg-amber-500/[0.08] p-4"><LockKeyhole className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" /><p className="text-xs leading-5 text-muted-foreground">Ces fichiers contiennent des informations personnelles. Chaque export est journalisé. Les rémunérations, références de paiement et descriptions d’activité sont exclus.</p></div>
    {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}{message && <p role="status" className="text-sm text-primary">{message}</p>}
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label className="block text-sm font-medium">Rapport
        <select value={type} onChange={(e) => setType(e.target.value as ReportType)} disabled={busy} className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"><option value="collaborateurs">Collaborateurs</option><option value="absences">Congés et absences</option><option value="prestations">Prestations enregistrées</option><option value="presence">Pointages de présence</option></select>
      </label><label className="block text-sm font-medium">Équipe <span className="font-normal text-muted-foreground">(facultatif, nom exact)</span>
        <input value={team} maxLength={150} onChange={(e) => setTeam(e.target.value)} disabled={busy} placeholder="Ex. Production audiovisuelle" className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
      </label><label className="block text-sm font-medium">Format
        <select value={format} onChange={(e) => setFormat(e.target.value as ReportFormat)} disabled={busy} className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"><option value="csv">CSV (tableur)</option><option value="pdf">PDF (imprimable)</option></select>
      </label></div>
      {type !== 'collaborateurs' && <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Du<input type="date" min="1900-01-01" required value={start} onChange={(e) => setStart(e.target.value)} disabled={busy} className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /></label><label className="block text-sm font-medium">Au<input type="date" min={start || '1900-01-01'} required value={end} onChange={(e) => setEnd(e.target.value)} disabled={busy} className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /></label></div>}
      <p className="text-xs leading-5 text-muted-foreground">Les absences qui chevauchent la période sont incluses. Les prestations sont les relevés enregistrés, pas les déclarations en attente. Maximum 5 000 lignes par export ; filtrez par équipe ou réduisez la période si nécessaire.</p>
      {format === 'pdf' && <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">Le PDF est condensé sur une seule page et affiche au maximum les 12 premières lignes. Choisissez CSV pour obtenir le rapport complet.</p>}
      <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"><Download className="h-4 w-4" />{busy ? 'Préparation…' : format === 'pdf' ? 'Télécharger le PDF' : 'Télécharger le CSV'}</button>
    </form>
  </section>;
}
