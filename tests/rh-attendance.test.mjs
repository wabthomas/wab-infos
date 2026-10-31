import test from 'node:test';
import assert from 'node:assert/strict';
import { assessArrival, validateAttendanceCorrection, ATTENDANCE_START_TIME, ATTENDANCE_END_TIME } from '../apps/redaction/src/lib/redaction/rh/attendance.ts';

test('présence : horaires annoncés et repère de retard sans pénalité automatique', () => {
  assert.equal(ATTENDANCE_START_TIME, '07:00');
  assert.equal(ATTENDANCE_END_TIME, '15:00');
  assert.equal(assessArrival(null), 'not_recorded');
  assert.equal(assessArrival('06:59'), 'on_time');
  assert.equal(assessArrival('07:00'), 'on_time');
  assert.equal(assessArrival('07:01'), 'late');
  assert.equal(assessArrival('09:30', true), 'excused');
  assert.equal(assessArrival('09:30', false, '2026-11-01'), 'not_scheduled');
});

test('demande de correction exige date conservée, heure valide et motif', () => {
  assert.deepEqual(validateAttendanceCorrection({ workDate:'2026-10-30', checkIn:'07:05', checkOut:'14:45', reason:'Panne réseau' }, '2026-10-31'), { workDate:'2026-10-30', checkIn:'07:05', checkOut:'14:45', reason:'Panne réseau' });
  assert.equal(validateAttendanceCorrection({ workDate:'2026-11-01', checkIn:'07:05', reason:'Panne réseau' }, '2026-10-31'), null);
  assert.equal(validateAttendanceCorrection({ workDate:'2026-10-30', checkIn:'15:10', checkOut:'07:00', reason:'Heures inversées' }, '2026-10-31'), null);
  assert.equal(validateAttendanceCorrection({ workDate:'2020-10-30', checkIn:'07:05', reason:'Ancienne demande' }, '2026-10-31'), null);
});
