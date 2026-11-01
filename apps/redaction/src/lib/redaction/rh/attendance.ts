export interface Attendance {
  id: string;
  workDate: string;
  checkIn: string | null;
  checkOut: string | null;
  note: string | null;
}

export interface TeamAttendance extends Attendance {
  collaboratorId: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  team: string;
  activityStatus: string | null;
  submissionStatus: string | null;
  absenceStatuses: string[];
}

export const ATTENDANCE_START_TIME = '07:00';
export const ATTENDANCE_END_TIME = '15:00';

export type ArrivalAssessment = 'on_time' | 'late' | 'excused' | 'not_recorded' | 'not_scheduled';

/** Retard = arrivée après 07:00, sans délai de grâce, du lundi au samedi. */
export function assessArrival(checkIn: string | null, excused = false, workDate?: string): ArrivalAssessment {
  if (!checkIn) return 'not_recorded';
  if (workDate && new Date(`${workDate}T00:00:00.000Z`).getUTCDay() === 0) return 'not_scheduled';
  if (excused) return 'excused';
  return checkIn > ATTENDANCE_START_TIME ? 'late' : 'on_time';
}

export type AttendanceAction = 'in' | 'out';

export interface AttendanceCorrectionInput {
  workDate: string;
  checkIn: string | null;
  checkOut: string | null;
  reason: string;
}

export type AttendanceCorrectionStatus = 'pending' | 'approved' | 'rejected';
export interface AttendanceCorrection extends AttendanceCorrectionInput {
  id: string;
  collaboratorId: string;
  firstName?: string;
  lastName?: string;
  source: 'employee' | 'admin';
  status: AttendanceCorrectionStatus;
  decisionNote: string;
  requestedByEmail: string;
  decidedByEmail: string | null;
  createdAt: string;
  decidedAt: string | null;
  history?: {
    beforeCheckIn: string | null;
    afterCheckIn: string;
    beforeCheckOut: string | null;
    afterCheckOut: string | null;
    actor: string;
    createdAt: string;
  } | null;
  version: number;
}

export function validateAttendanceCorrection(value: unknown, today: string): AttendanceCorrectionInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const workDate = input.workDate;
  const checkIn = input.checkIn === '' || input.checkIn === null ? null : input.checkIn;
  const checkOut = input.checkOut === '' || input.checkOut === null ? null : input.checkOut;
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (typeof workDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(workDate) || workDate > today || workDate < `${Number(today.slice(0, 4)) - 5}${today.slice(4)}`) return null;
  const parsedDate = new Date(`${workDate}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== workDate) return null;
  const validTime = (time: unknown): time is string => typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  if ((!checkIn && !checkOut) || (checkIn !== null && !validTime(checkIn)) || (checkOut !== null && !validTime(checkOut)) || (checkIn && checkOut && checkOut < checkIn) || reason.length < 8 || reason.length > 500) return null;
  return { workDate, checkIn: checkIn as string | null, checkOut: checkOut as string | null, reason };
}
