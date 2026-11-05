'use client';
import { useEffect, useState } from 'react';
import { YoutubeClaimAdmin } from './youtube-claim-admin';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { formatMinorUnits, parseMonthlyAmount, type RhCurrency } from '@/lib/redaction/rh/money';
import type { YoutubePerformance } from '@/lib/redaction/rh/youtube-performance';

const endpoint = '/api/redaction/rh/performances';
function count(value: string | null) { return value === null ? '—' : BigInt(value).toLocaleString('fr-FR'); }
function csvCell(value: string) { const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value; return `"${safe.replaceAll('"', '""')}"`; }
export function YoutubePerformanceAdmin({ canManageBonus }: { canManageBonus: boolean }) {
  const [rows, setRows] = useState<YoutubePerformance[]>([]);
  const [showClaim, setShowClaim] = useState(false);
  const [filter, setFilter] = useState(''); const [month, setMonth] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({}); const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [currencies, setCurrencies] = useState<Record<string, RhCurrency>>({});
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true);
    fetchRedaction(endpoint, { cache: 'no-store', signal: controller.signal })
      .then(async r => { if (!r.ok) throw new Error(); setRows((await r.json()).performances); setError(''); })
      .catch(() => { if (!controller.signal.aborted) setError('Rapport YouTube indisponible. Vérifiez la migration et la clé YouTube côté serveur.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  const visible = rows.filter(item => (!filter || `${item.collaboratorName} ${item.title} ${item.role}`.toLocaleLowerCase('fr').includes(filter.toLocaleLowerCase('fr'))) && (!month || item.submissionDate.startsWith(month)));
  const approved = visible.filter(row => row.status === 'approved' && row.submissionStatus === 'approved' && !row.unavailableAt);
  const uniqueVideos = [...new Map(approved.map(row => [row.videoId, row])).values()];
  function total(key: 'views' | 'likes' | 'comments') { const available = uniqueVideos.filter(row => row[key] !== null); return available.length ? count(available.reduce((sum, row) => sum + BigInt(row[key]!), BigInt(0)).toString()) : '—'; }
  async function request(url: string, method: 'POST' | 'PATCH', body?: object) {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetchRedaction(url, { method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Action impossible.');
      setMessage('Décision enregistrée.'); setReload(n => n + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Action impossible.'); }
    finally { setBusy(false); }
  }
  function downloadCsv() {
    const columns = ['Date','Collaborateur','Rôle','Vidéo','Lien','Statut prestation','Statut contribution','Vues','J’aime','Commentaires','Relevé à','Prime évaluée','Devise','Justification'];
    const lines = [columns, ...visible.map(p => [p.submissionDate, p.collaboratorName || '', p.role, p.title, p.url, p.submissionStatus, p.status, p.status === 'approved' ? p.views ?? '' : '', p.status === 'approved' ? p.likes ?? '' : '', p.status === 'approved' ? p.comments ?? '' : '', p.checkedAt || '', p.status === 'approved' ? p.bonusMinor : '', p.bonusCurrency, p.bonusNote])];
    const blob = new Blob(['\uFEFF', lines.map(line => line.map(csvCell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = href; a.download = `performances-youtube-${month || 'toutes'}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
  return <section id="performances-youtube" className="scroll-mt-6 space-y-4 rounded-xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-lg font-bold">Performances YouTube · équipe</h2></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setShowClaim(value => !value)} aria-expanded={showClaim} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">{showClaim ? 'Fermer' : '+ Ajouter une vidéo'}</button><button type="button" disabled={busy} onClick={() => void request(`${endpoint}/actualiser`, 'POST')} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50">Actualiser (6 h)</button><button type="button" disabled={!visible.length} onClick={downloadCsv} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50">Rapport CSV</button></div></div>
    {showClaim && <YoutubeClaimAdmin linkedSubmissionIds={rows.map(row => row.submissionId)} onAdded={() => setReload(n => n + 1)} />}
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}{message && <p role="status" className="text-sm text-primary">{message}</p>}
    <div className="grid grid-cols-3 gap-2">{([['Vues', total('views')], ['J’aime', total('likes')], ['Commentaires', total('comments')]] as const).map(([label,value]) => <div key={label} className="rounded-xl bg-muted/60 p-3"><p className="text-xs text-muted-foreground">{label} · vidéos validées</p><p className="text-lg font-bold tabular-nums">{value}</p></div>)}</div>
    <div className="flex flex-wrap gap-2"><input aria-label="Filtrer collaborateurs et vidéos" placeholder="Collaborateur, vidéo, rôle…" className="rounded-lg border border-border bg-background p-2 text-sm" value={filter} onChange={e => setFilter(e.target.value)} /><input aria-label="Mois de la prestation" type="month" className="rounded-lg border border-border bg-background p-2 text-sm" value={month} onChange={e => setMonth(e.target.value)} /></div>
    {loading && <p role="status">Chargement…</p>}
    {!loading && !visible.length && <p className="text-sm text-muted-foreground">Aucune contribution pour ces filtres.</p>}
    <div className="max-h-[45rem] space-y-3 overflow-y-auto">{visible.map(item => <article key={item.id} className="rounded-xl border border-border p-4 text-sm">
      <p className="font-bold">{item.collaboratorName} · {item.role} · {item.submissionDate}</p><a href={item.url} rel="noopener noreferrer" target="_blank" className="text-primary underline">{item.title} ↗</a>
      <p className="mt-1 text-muted-foreground">Prestation : {item.submissionStatus} · Contribution : {item.status}{item.unavailableAt ? ' · Vidéo indisponible' : ''}</p>
      <p className="mt-1 tabular-nums">Vues {count(item.views)} · J’aime {count(item.likes)} · Commentaires {count(item.comments)} <span className="text-muted-foreground">· Relevé {item.checkedAt ? new Date(item.checkedAt).toLocaleString('fr-FR') : 'inconnu'}</span></p>
      {item.note && <p>Décision : {item.note}</p>}
      {item.status === 'pending' && <div className="mt-3 space-y-2">
        {item.submissionStatus === 'pending' && <button type="button" disabled={busy || !!item.unavailableAt || Date.now() - new Date(item.checkedAt || 0).getTime() > 48 * 3600000} onClick={() => void request('/api/redaction/rh/declarations', 'PATCH', { id: item.submissionId, version: item.submissionVersion, decision: 'approve', note: notes[item.id] || '' })} className="rounded-lg border border-primary px-3 py-2 font-semibold text-primary disabled:opacity-50">Valider la prestation après vérification</button>}
        <label className="block">Note de décision (obligatoire en cas de refus)<input maxLength={500} className="mt-1 w-full rounded-lg border border-border bg-background p-2" value={notes[item.id] ?? ''} onChange={e => setNotes({ ...notes, [item.id]: e.target.value })} /></label>
        <div className="flex gap-2"><button type="button" disabled={busy || item.submissionStatus !== 'approved' || !!item.unavailableAt || Date.now() - new Date(item.checkedAt || 0).getTime() > 48 * 3600000} onClick={() => void request(endpoint, 'PATCH', { id: item.id, version: item.version, action: 'approve', note: notes[item.id] || '' })} className="rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground disabled:opacity-50">Valider la contribution</button><button type="button" disabled={busy || !notes[item.id]?.trim()} onClick={() => void request(endpoint, 'PATCH', { id: item.id, version: item.version, action: 'reject', note: notes[item.id] })} className="rounded-lg border border-rose-500 px-3 py-2 font-semibold text-rose-700 disabled:opacity-50">Refuser</button></div>
      </div>}
      {item.status === 'approved' && <div className="mt-3"><p className="font-semibold">Prime évaluée : {formatMinorUnits(BigInt(item.bonusMinor), item.bonusCurrency)} <span className="font-normal text-muted-foreground">(à intégrer manuellement au circuit de rémunération)</span></p>{item.bonusNote && <p className="text-muted-foreground">Motif : {item.bonusNote}</p>}
        {canManageBonus && <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); const value = parseMonthlyAmount(amounts[item.id] ?? ''); if (value === null) { setError('Montant de prime invalide.'); return; } void request(endpoint, 'PATCH', { id: item.id, version: item.version, action: 'bonus', amount: value.toString(), currency: currencies[item.id] || item.bonusCurrency, note: notes[item.id] || '' }); }}><label>Prime (montant décimal)<input required inputMode="decimal" className="mt-1 block w-32 rounded-lg border border-border bg-background p-2" value={amounts[item.id] ?? ''} onChange={e => setAmounts({ ...amounts, [item.id]: e.target.value })} placeholder="0,00" /></label><label>Devise<select className="mt-1 block rounded-lg border border-border bg-background p-2" value={currencies[item.id] || item.bonusCurrency} onChange={e => setCurrencies({ ...currencies, [item.id]: e.target.value as RhCurrency })}><option>CDF</option><option>USD</option></select></label><label>Justification / caisse<input maxLength={500} className="mt-1 block w-52 rounded-lg border border-border bg-background p-2" value={notes[item.id] ?? ''} onChange={e => setNotes({ ...notes, [item.id]: e.target.value })} /></label><button disabled={busy} className="rounded-lg border border-primary px-3 py-2 font-semibold text-primary disabled:opacity-50">Enregistrer l’évaluation</button></form>}
      </div>}
    </article>)}</div>
    {rows.length === 500 && <p className="text-xs text-muted-foreground">Rapport limité aux 500 contributions récentes ; les anciennes contributions nécessitent une pagination serveur avant export exhaustif.</p>}
  </section>;
}
