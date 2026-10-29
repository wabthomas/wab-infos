import { isValidDate } from './activities';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export interface Submission { id: string; date: string; description: string; status: SubmissionStatus; decisionNote: string; version: number }
export interface SubmissionInput { date: string; description: string }
export function validateSubmission(value: unknown, today: string): SubmissionInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!isValidDate(today) || !isValidDate(v.date) || v.date > today || typeof v.description !== 'string') return null;
  const description = v.description.trim();
  if (!description || description.length > 500 || /[\u0000-\u001f\u007f]/.test(description)) return null;
  return { date: v.date, description };
}
export function validateSubmissionDecision(value: unknown): { decision: 'approve' | 'reject'; note: string } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if ((v.decision !== 'approve' && v.decision !== 'reject') || typeof v.note !== 'string') return null;
  const note = v.note.trim();
  if (note.length > 500 || /[\u0000-\u001f\u007f]/.test(note) || (v.decision === 'reject' && !note)) return null;
  return { decision: v.decision, note };
}
