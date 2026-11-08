-- Nouvelles notifications RH : types étendus pour distinguer décision, contrat, document, etc.
BEGIN;
ALTER TABLE redaction_rh.notifications ALTER COLUMN event_type TYPE varchar(48);
ALTER TABLE redaction_rh.notifications DROP CONSTRAINT IF EXISTS notifications_event_type_check;
ALTER TABLE redaction_rh.notifications ADD CONSTRAINT notifications_event_type_check
  CHECK (event_type IN (
    'absence','absence_approved','absence_rejected',
    'prestation','prestation_approved','prestation_rejected',
    'remuneration','retrait','service_card',
    'attendance_correction','attendance_correction_requested',
    'dispute','dispute_created','historical','document_available'
  ));
COMMIT;
