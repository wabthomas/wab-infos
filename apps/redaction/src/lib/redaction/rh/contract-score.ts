/** Grille approuvée CDD journaliste (15/11/2026) : les notes d’items restent saisies et justifiées par un responsable. */
export const CONTRACT_SCORE_MAXIMA = {
  youtube: 40,
  quality: 25,
  production: 20,
  interviews: 15,
} as const;

export type ContractScoreKey = keyof typeof CONTRACT_SCORE_MAXIMA;
export type ContractScoreInput = Record<ContractScoreKey, number>;
export type ContractScoreNotes = Record<ContractScoreKey, string>;
export type ContractEvaluationInput = { scores: ContractScoreInput; notes: ContractScoreNotes };
export type ContractEvaluationResult = {
  scores: ContractScoreInput;
  notes: ContractScoreNotes;
  total: number;
  amountMinor: string;
  currency: 'USD';
};

/** La table de seuils du contrat s’applique au total final, pas à chaque rubrique. */
export function contractAmountForScore(score: number): string | null {
  if (!Number.isFinite(score) || score < 0 || score > 100) return null;
  if (score < 60) return '4000';
  if (score < 70) return '5000';
  if (score < 80) return '6500';
  if (score < 90) return '8000';
  return '10000';
}

export function validateContractEvaluation(value: unknown): ContractEvaluationResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const rawScores = record.scores;
  const rawNotes = record.notes;
  if (!rawScores || typeof rawScores !== 'object' || Array.isArray(rawScores)
    || !rawNotes || typeof rawNotes !== 'object' || Array.isArray(rawNotes)) return null;

  const scores = {} as ContractScoreInput;
  const notes = {} as ContractScoreNotes;
  for (const key of Object.keys(CONTRACT_SCORE_MAXIMA) as ContractScoreKey[]) {
    const points = (rawScores as Record<string, unknown>)[key];
    const note = (rawNotes as Record<string, unknown>)[key];
    if (typeof points !== 'number' || !Number.isInteger(points) || points < 0 || points > CONTRACT_SCORE_MAXIMA[key]) return null;
    if (typeof note !== 'string' || !note.trim() || note.trim().length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(note)) return null;
    scores[key] = points;
    notes[key] = note.trim();
  }
  const total = scores.youtube + scores.quality + scores.production + scores.interviews;
  const amountMinor = contractAmountForScore(total);
  if (amountMinor === null) return null;
  return { scores, notes, total, amountMinor, currency: 'USD' };
}
