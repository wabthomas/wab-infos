import { isUuid, isValidDate } from './activities';

export type AbsenceStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export interface AbsenceInput { collaboratorId: string; startDate: string; endDate: string; category: string }
export interface Absence extends AbsenceInput { id: string; status: AbsenceStatus; decisionNote: string; version: number }
export type AbsenceDecision = 'approve' | 'reject' | 'cancel';

export function validateAbsence(value: unknown): AbsenceInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!isUuid(v.collaboratorId) || !isValidDate(v.startDate) || !isValidDate(v.endDate) || v.endDate < v.startDate || typeof v.category !== 'string') return null;
  const category = v.category.trim();
  if (!category || category.length > 100 || /[\u0000-\u001f\u007f]/.test(category)) return null;
  // Évite les saisies involontairement démesurées, sans préjuger des droits aux congés.
  if ((Date.parse(`${v.endDate}T00:00:00Z`) - Date.parse(`${v.startDate}T00:00:00Z`)) / 86400000 > 365) return null;
  return { collaboratorId: v.collaboratorId, startDate: v.startDate, endDate: v.endDate, category };
}

export function validateDecision(value: unknown): { decision: AbsenceDecision; note: string } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (v.decision !== 'approve' && v.decision !== 'reject' && v.decision !== 'cancel') return null;
  if (typeof v.note !== 'string') return null;
  const note = v.note.trim();
  if (note.length > 500 || /[\u0000-\u001f\u007f]/.test(note) || (v.decision === 'reject' && !note)) return null;
  return { decision: v.decision, note };
}

/** Transitions explicites ; l'annulation d'une absence approuvée reste une action tracée. */
export function nextAbsenceStatus(current: AbsenceStatus, decision: AbsenceDecision): AbsenceStatus | null {
  if (current === 'pending' && decision === 'approve') return 'approved';
  if (current === 'pending' && decision === 'reject') return 'rejected';
  if ((current === 'pending' || current === 'approved') && decision === 'cancel') return 'cancelled';
  return null;
}
