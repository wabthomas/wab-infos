export type ContractState = 'draft' | 'proposed' | 'pending_approval' | 'accepted' | 'declined';
export type ContractProgress = { label: string; reminder: string | null; stage: number };

/** UTC calendar days, not browser-local timestamps: a CDD expires at the same date for both parties. */
export function contractProgress(status: ContractState, kind: 'CDD' | 'CDI', startDate: string, endDate: string | null, today = new Date().toISOString().slice(0,10)): ContractProgress {
  const stages: Record<ContractState,ContractProgress> = {
    draft:{ label:'Brouillon',reminder:null,stage:0 },
    proposed:{ label:'Transmis · à signer',reminder:null,stage:1 },
    pending_approval:{ label:'Signé · en attente d’approbation',reminder:null,stage:2 },
    accepted:{ label:'Approuvé',reminder:null,stage:3 },
    declined:{ label:'Refusé',reminder:null,stage:1 },
  };
  const base = stages[status];
  if (status !== 'accepted') return base;
  if (startDate > today) return { ...base,label:'Approuvé · prise d’effet à venir' };
  if (kind !== 'CDD' || !endDate) return { ...base,label:'Approuvé · en cours' };
  const days = Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  if (!Number.isFinite(days)) return base;
  if (days < 0) return { ...base,label:'Terme dépassé · à traiter',reminder:'Le terme indiqué est dépassé. Vérifiez la mise à terme ou préparez un nouveau contrat : aucun renouvellement automatique.' };
  if (days <= 60) return { ...base,label:'Approuvé · échéance proche',reminder:days === 0 ? 'Le CDD arrive à terme aujourd’hui. Vérifiez sa mise à terme ou préparez un nouveau contrat.' : `Le CDD arrive à terme dans ${days} jour${days > 1 ? 's' : ''}. Anticipez la mise à terme ou un renouvellement par nouveau contrat validé.` };
  return { ...base,label:'Approuvé · en cours' };
}
