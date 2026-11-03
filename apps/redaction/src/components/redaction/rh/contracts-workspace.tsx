'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { DEFAULT_ORGANIZATION_SETTINGS, type OrganizationSettings } from '@/lib/redaction/rh/organization';
import { useToast } from '@/components/ui/toast';

type Person = { id: string; firstName: string; lastName: string; jobTitle: string; startDate: string; archived: boolean };
async function png(src: string | null, opacity = 1): Promise<string | null> {
  if (!src) return null;
  return new Promise(resolve => {
    const image = new Image(); image.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); if (!ctx) { resolve(null); return; }
      ctx.globalAlpha = opacity; ctx.drawImage(image, 0, 0); resolve(canvas.toDataURL('image/png'));
    }; image.onerror = () => resolve(null); image.src = src;
  });
}

/** Préparation documentaire uniquement : pas de clauses légales inventées ni de signature du collaborateur par l'admin. */
export function ContractsWorkspace() {
  const toast = useToast();
  const [people, setPeople] = useState<Person[]>([]);
  const [settings, setSettings] = useState<OrganizationSettings>(DEFAULT_ORGANIZATION_SETTINGS);
  const [seal, setSeal] = useState<string | null>(null), [signature, setSignature] = useState<string | null>(null);
  const [personId, setPersonId] = useState(''), [kind, setKind] = useState<'CDD' | 'CDI'>('CDD');
  const [startDate, setStartDate] = useState(''), [endDate, setEndDate] = useState('');
  const [job, setJob] = useState(''), [location, setLocation] = useState('');
  const [salary, setSalary] = useState(''), [currency, setCurrency] = useState<'CDF' | 'USD'>('CDF');
  const [clauses, setClauses] = useState(''), [approved, setApproved] = useState(false);
  const [sign, setSign] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const person = people.find(p => p.id === personId);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const paths = ['/api/redaction/rh/collaborateurs','/api/redaction/rh/organisation','/api/redaction/rh/organisation/assets/company-seal','/api/redaction/rh/organisation/assets/director-signature'];
        const responses = await Promise.all(paths.map(path => fetchRedaction(path, { cache: 'no-store' })));
        if (responses.some(response => !response.ok)) throw new Error('Chargement RH impossible.');
        const [list, org, stamp, image] = await Promise.all(responses.map(r => r.json()));
        if (active) { setPeople((list.collaborators as Person[]).filter(p => !p.archived)); setSettings({ ...DEFAULT_ORGANIZATION_SETTINGS, ...org.settings }); setSeal(stamp.asset); setSignature(image.asset); }
      } catch { if (active) setError('Impossible de charger les collaborateurs et les visuels RH.'); }
    }
    void load(); return () => { active = false; };
  }, []);
  function changePerson(id: string) {
    const next = people.find(p => p.id === id);
    setPersonId(id); setJob(next?.jobTitle || ''); setStartDate(next?.startDate || ''); setApproved(false); setSign(false);
  }
  async function exportPdf() {
    setError('');
    if (!person || !job.trim() || !location.trim() || !startDate || !clauses.trim() || !/^(?:[1-9]\d{0,11})(?:[.,]\d{1,2})?$/.test(salary) || (kind === 'CDD' && (!endDate || endDate <= startDate))) { setError('Complétez le dossier, les dates, le lieu, la rémunération et les clauses validées.'); return; }
    if (!approved) { setError('La validation juridique des clauses est nécessaire avant la préparation du PDF.'); return; }
    if (sign && (!settings.directorName.trim() || !signature || !seal)) { setError('Configurez le nom, le sceau et la signature image du DG avant son visa.'); return; }
    setBusy(true);
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ format: 'a4', unit: 'mm', compress: true });
      const width = 170; let y = 34;
      const newPage = () => { pdf.addPage(); y = 28; };
      const write = (value: string, size = 11, bold = false, gap = 4) => {
        pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size);
        for (const paragraph of value.replace(/\r\n?/g,'\n').split('\n')) {
          const lines = paragraph ? pdf.splitTextToSize(paragraph, width) as string[] : [''];
          for (const line of lines) { if (y > 265) newPage(); pdf.text(line, 20, y); y += size * .45 + 2; }
          y += gap;
        }
      };
      pdf.setTextColor(36,36,45);
      write(settings.companyName || 'Entreprise', 16, true);
      write([settings.companyAddress, settings.documentHeader].filter(Boolean).join(' · '), 9);
      pdf.setDrawColor(158,38,70); pdf.line(20, y, 190, y); y += 14;
      write(`PROJET DE CONTRAT ${kind}`, 16, true, 8);
      write(`Employeur : ${settings.companyName}`, 11, true);
      write(`Collaborateur : ${person.firstName} ${person.lastName}`, 11, true);
      write(`Fonction : ${job.trim()} · Lieu : ${location.trim()}`);
      write(`Prise d'effet : ${startDate}${kind === 'CDD' ? ` · Date de fin indiquée : ${endDate}` : ''}`);
      write(`Rémunération déclarée : ${salary.replace(',','.')} ${currency} (périodicité et modalités à préciser dans les clauses)`, 10);
      y += 8; write('CLAUSES VALIDÉES PAR LA DIRECTION', 12, true, 5);
      write(clauses.trim(), 11, false, 6);
      if (y > 224) newPage();
      y += 10;
      const imgSeal = sign ? await png(seal, .22) : null, imgSignature = sign ? await png(signature) : null;
      if (imgSeal) pdf.addImage(imgSeal, 'PNG', 112, y - 3, 29, 29);
      pdf.setFontSize(9); pdf.text(`Pour ${settings.companyName}`, 110, y);
      if (imgSignature) pdf.addImage(imgSignature, 'PNG', 110, y + 3, Math.min(48, Number(settings.directorSignatureWidth) / 4), Math.min(23, Number(settings.directorSignatureHeight) / 4));
      pdf.text(`${settings.directorName || 'Nom du DG'} · ${settings.directorTitle || 'Direction générale'}`, 110, y + 34);
      pdf.text(`Signature du collaborateur : ${person.firstName} ${person.lastName}`, 20, y + 34);
      for (let i = 1; i <= pdf.getNumberOfPages(); i++) {
        pdf.setPage(i); pdf.setDrawColor(210); pdf.line(20, 280, 190, 280);
        pdf.setFontSize(8); pdf.setTextColor(85);
        pdf.text(settings.documentFooter || 'Document RH privé', 20, 286, { maxWidth: 145 });
        pdf.text(`${i} / ${pdf.getNumberOfPages()}`, 190, 286, { align: 'right' });
        if (!sign) { pdf.setTextColor(158,38,70); pdf.text('PROJET NON SIGNÉ', 190, 13, { align: 'right' }); }
      }
      pdf.save(`projet-contrat-${kind.toLowerCase()}-${person.lastName.replace(/[^a-zA-Z0-9-]/g,'-')}.pdf`);
      toast.success('Projet PDF prêt. Déposez la version signée dans Documents RH après contrôle.');
    } catch { setError('Génération PDF impossible.'); toast.error('Génération PDF impossible.'); }
    finally { setBusy(false); }
  }
  const input = 'mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm';
  return <div className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-7">
    <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Contrats RH · RDC</p><h2 className="mt-2 text-2xl font-bold">Préparer un CDD ou un CDI</h2><p className="mt-2 text-sm text-muted-foreground">Préparation PDF multi-pages. Aucune durée, clause ou règle de droit congolais n’est présumée : faites valider le texte par un juriste avant utilisation.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">Collaborateur<select className={input} value={personId} onChange={e => changePerson(e.target.value)}><option value="">Sélectionner…</option>{people.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}</select></label>
      <label className="text-sm font-medium">Type de contrat<select className={input} value={kind} onChange={e => { setKind(e.target.value as 'CDD' | 'CDI'); setApproved(false); setSign(false); }}><option value="CDD">CDD</option><option value="CDI">CDI</option></select></label>
      <label className="text-sm font-medium">Fonction<input className={input} value={job} maxLength={160} onChange={e => { setJob(e.target.value); setApproved(false); setSign(false); }} /></label>
      <label className="text-sm font-medium">Lieu d’affectation<input className={input} value={location} maxLength={180} onChange={e => { setLocation(e.target.value); setApproved(false); setSign(false); }} /></label>
      <label className="text-sm font-medium">Date de prise d’effet<input className={input} type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setApproved(false); setSign(false); }} /></label>
      {kind === 'CDD' && <label className="text-sm font-medium">Date de fin indiquée<input className={input} type="date" value={endDate} min={startDate} onChange={e => { setEndDate(e.target.value); setApproved(false); setSign(false); }} /></label>}
      <label className="text-sm font-medium">Rémunération indiquée<input className={input} inputMode="decimal" value={salary} onChange={e => { setSalary(e.target.value); setApproved(false); setSign(false); }} placeholder="Montant" /></label>
      <label className="text-sm font-medium">Devise<select className={input} value={currency} onChange={e => { setCurrency(e.target.value as 'CDF' | 'USD'); setApproved(false); setSign(false); }}><option>CDF</option><option>USD</option></select></label>
    </div>
    <label className="block text-sm font-medium">Clauses contractuelles validées<textarea className={input + ' min-h-72'} value={clauses} maxLength={12000} onChange={e => { setClauses(e.target.value); setApproved(false); setSign(false); }} placeholder="Collez ici uniquement des clauses approuvées par votre conseil juridique…" /></label>
    <p className="rounded-xl bg-amber-500/10 p-3 text-sm">Ce PDF est préparatoire. La signature image du DG n’est qu’une reproduction visuelle ; elle ne prouve pas son consentement. La signature du collaborateur reste à recueillir par lui-même, jamais par l’administrateur.</p>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={approved} onChange={e => { setApproved(e.target.checked); setSign(false); }} className="mt-1" /> Je confirme avoir fait valider les clauses, dates et montants pour ce contrat soumis au droit de la RDC.</label>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={sign} disabled={!approved || !signature || !seal || !settings.directorName} onChange={e => setSign(e.target.checked)} className="mt-1" /> Après accord réel du DG, afficher son image de signature et le sceau de l’entreprise.</label>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={busy} onClick={() => void exportPdf()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy ? 'Préparation…' : 'Télécharger le projet PDF'}</button><Link href="/rh/documents" className="text-sm font-semibold text-primary underline">Déposer la version signée dans Documents RH</Link></div>
    <p className="text-xs text-muted-foreground">Les champs saisis ici ne sont pas enregistrés sur le serveur. Conservez le PDF en lieu sûr ; seul un fichier déposé dans Documents RH peut être partagé avec le collaborateur. Pas de signature électronique qualifiée.</p>
  </div>;
}
