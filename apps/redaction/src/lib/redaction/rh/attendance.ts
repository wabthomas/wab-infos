export interface Attendance {
  id: string;
  workDate: string;
  checkIn: string | null;
  checkOut: string | null;
  note: string | null;
}

export type AttendanceAction = 'in' | 'out';
