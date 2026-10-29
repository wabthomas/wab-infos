'use client';
import { useState, type FormEvent } from 'react';
import { Download, FileSpreadsheet, LockKeyhole } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { parseReportFilter, type ReportType } from '@/lib/redaction/rh/reports';

export function Reports({ today }: { today: string }) {
  const [type, setType] = useState<ReportType>('collaborateurs');
  const [start, setStart] = useState(`${today.slice(0, 7)}-01`); const [end, setEnd] = useState(today);
  const [team, setTeam] = useState(''); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('');
    const params = new URLSearchParams({ type, team });
    if (type !== 'collaborateurs') { params.set('start', start); params.set('end', end); }
    if (!parseReportFilter(params)) { setError('Vérifiez les filtres et les dates (366 jours maximum).'); return; }
    setBusy(true);
    try {
      const response = await fetchRedaction(`/api/redaction/rh/rapports?${params}`, { method: 'POST', cache: 'no-store' });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Export indisponible.'); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      try { const anchor = document.createElement('a'); anchor.href = url; anchor.download = `rh-${type}.csv`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); }
      finally { window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
      setMessage('Export généré. Conservez le fichier dans un emplacement sécurisé.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Export impossible.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
    <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/[0.07] text-primary"><FileSpreadsheet className="h-5 w-5" /></span>
      <div><h3 className="font-semibold">Exporter un rapport</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Téléchargez un fichier CSV avec les données nécessaires à votre suivi RH.</p></div></div>
    <div className="flex gap-3 rounded-xl bg-amber-500/[0.08] p-4"><LockKeyhole className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" /><p className="text-xs leading-5 text-muted-foreground">Ces fichiers contiennent des informations personnelles. Chaque export est journalisé. Les rémunérations, références de paiement et descriptions d’activité sont exclus.</p></div>
    {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}{message && <p role="status" className="text-sm text-primary">{message}</p>}
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Rapport
        <select value={type} onChange={(e) => setType(e.target.value as ReportType)} disabled={busy} className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"><option value="collaborateurs">Collaborateurs</option><option value="absences">Congés et absences</option><option value="prestations">Prestations enregistrées</option></select>
      </label><label className="block text-sm font-medium">Équipe <span className="font-normal text-muted-foreground">(facultatif, nom exact)</span>
        <input value={team} maxLength={150} onChange={(e) => setTeam(e.target.value)} disabled={busy} placeholder="Ex. Production audiovisuelle" className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
      </label></div>
      {type !== 'collaborateurs' && <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Du<input type="date" min="1900-01-01" required value={start} onChange={(e) => setStart(e.target.value)} disabled={busy} className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /></label><label className="block text-sm font-medium">Au<input type="date" min={start || '1900-01-01'} required value={end} onChange={(e) => setEnd(e.target.value)} disabled={busy} className="mt-1.5 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /></label></div>}
      <p className="text-xs leading-5 text-muted-foreground">Les absences qui chevauchent la période sont incluses. Les prestations sont les relevés enregistrés, pas les déclarations en attente. Maximum 5 000 lignes par export ; filtrez par équipe ou réduisez la période si nécessaire.</p>
      <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"><Download className="h-4 w-4" />{busy ? 'Préparation…' : 'Télécharger le CSV'}</button>
    </form>
  </section>;
}
